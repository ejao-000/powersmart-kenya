package service

import (
	"fmt"
	"strings"
	"time"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// InsightsService powers landlord-facing intelligence:
//
//   - Unit comparison: every meter the account owns, summarised side-by-side
//     (usage, spend, week-over-week trend) so outliers are easy to spot.
//   - Unusual usage detection: a lightweight anomaly engine over the daily usage
//     series flags sudden consumption spikes, persistent very-high loads and
//     suspicious inactivity — patterns landlords care about (possible theft,
//     a forgotten geyser, an occupied-but-unmetered unit).
//   - Monthly expense reports: actual token purchases grouped per meter.
type InsightsService struct {
	meterRepo *repositories.MeterRepo
	tokenRepo *repositories.TokenRepo
	usageSvc  *UsageService
}

func NewInsightsService(meterRepo *repositories.MeterRepo, tokenRepo *repositories.TokenRepo, usageSvc *UsageService) *InsightsService {
	return &InsightsService{meterRepo: meterRepo, usageSvc: usageSvc, tokenRepo: tokenRepo}
}

func meterDisplayName(m *model.Meter) string {
	if strings.TrimSpace(m.Name) != "" {
		return m.Name
	}
	if m.MeterNumber != "" {
		return m.MeterNumber
	}
	return "Unit"
}

// Insights compares every meter the user owns.
func (s *InsightsService) Insights(userID string) (*model.InsightsBundle, error) {
	meters, err := s.meterRepo.ListByOwner(userID)
	if err != nil {
		return nil, err
	}
	if meters == nil {
		meters = []*model.Meter{}
	}

	bundle := &model.InsightsBundle{Units: []*model.UnitInsight{}, GeneratedAt: time.Now()}
	for _, m := range meters {
		insight := s.unitInsight(m)
		bundle.Units = append(bundle.Units, insight)
		bundle.TotalMonthCost += insight.MonthCostKsh
		bundle.TotalMonthKwh += insight.MonthKwh
		if insight.Anomaly != nil {
			bundle.FlaggedCount++
		}
	}

	bundle.TotalMonthCost = round2(bundle.TotalMonthCost)
	bundle.TotalMonthKwh = round2(bundle.TotalMonthKwh)
	return bundle, nil
}

// unitInsight computes one meter's comparison row plus any anomaly.
func (s *InsightsService) unitInsight(m *model.Meter) *model.UnitInsight {
	insight := &model.UnitInsight{
		MeterID:        m.ID,
		MeterName:      meterDisplayName(m),
		MeterNumber:    m.MeterNumber,
		UnitsRemaining: m.UnitsRemaining,
	}

	usage, err := s.usageSvc.SummarizeMeter(m)
	if err != nil || usage == nil {
		return insight
	}

	insight.DailyAvgKwh = round2(usage.DailyAvgKwh)
	insight.MonthKwh = usage.MonthKwh
	insight.MonthCostKsh = usage.MonthCostKsh

	last7, prev7 := weekSums(usage.Daily)
	insight.Last7Kwh = round2(last7)
	insight.Prev7Kwh = round2(prev7)
	if prev7 > 0 {
		insight.ChangePct = round2((last7 - prev7) / prev7 * 100)
	}

	insight.Anomaly = detectAnomaly(last7, prev7, usage.DailyAvgKwh)
	return insight
}

// weekSums returns total kWh in the final 7 days and the 7 days before that.
func weekSums(daily []*model.UsageDay) (float64, float64) {
	if len(daily) < 14 {
		return 0, 0
	}
	total := len(daily)
	var last, prev float64
	for i := total - 7; i < total; i++ {
		last += daily[i].Kwh
	}
	for i := total - 14; i < total-7; i++ {
		prev += daily[i].Kwh
	}
	return last, prev
}

// detectAnomaly applies simple, explainable heuristics over the weekly trend.
// It is deliberately conservative: it only flags clear, meaningful deviations.
func detectAnomaly(last7, prev7, dailyAvg float64) *model.MeterAnomaly {
	// Persistent very-high baseline (independent of weekly trend).
	if prev7 <= 0 && last7 >= 7 && dailyAvg >= 25 {
		return &model.MeterAnomaly{
			Severity: "warning",
			Title:    "Persistently very high consumption",
			Reason: fmt.Sprintf(
				"This meter is using ~%.0f kWh/day — several times a typical household. Check for a water heater left on, running heating elements or a submeter bypass.",
				dailyAvg,
			),
			Action: "Ask the tenant to check water heating and audit the unit's loads.",
		}
	}

	if prev7 <= 0 {
		return nil // not enough baseline to compare
	}

	pct := (last7 - prev7) / prev7 * 100

	// Sudden jump — the classic "something changed" signal (theft, new load, leak).
	switch {
	case pct >= 75:
		return &model.MeterAnomaly{
			Severity: "critical",
			Title:    "Consumption spiked sharply this week",
			Reason: fmt.Sprintf(
				"Usage jumped from %s to %s kWh week-on-week (%.0f%%). This can indicate theft, an added high-load appliance or a running geyser.",
				trimFloat(prev7), trimFloat(last7), pct,
			),
			Action: "Verify the unit is still metered correctly and ask the tenant what changed.",
		}
	case pct >= 40:
		return &model.MeterAnomaly{
			Severity: "warning",
			Title:    "Unusually high usage this week",
			Reason: fmt.Sprintf(
				"%s kWh this week versus %s kWh the previous one (%.0f%% up).",
				trimFloat(last7), trimFloat(prev7), pct,
			),
			Action: "Watch next week — if it stays high, inspect for bypass or a heavy new load.",
		}
	case pct <= -60 && prev7 >= 10 && last7 <= 3:
		return &model.MeterAnomaly{
			Severity: "info",
			Title:    "No usage detected this week",
			Reason: fmt.Sprintf(
				"Usage dropped from %s to %s kWh. The unit may be vacant, off-grid or experiencing an outage.",
				trimFloat(prev7), trimFloat(last7),
			),
			Action: "Confirm the tenant is present and that the meter can still be read.",
		}
	}

	return nil
}

// MonthlyReport builds the actual token-spend statement for a calendar month.
func (s *InsightsService) MonthlyReport(userID, period string) (*model.MonthlyReport, error) {
	from, err := parsePeriod(period)
	if err != nil {
		return nil, err
	}
	to := from.AddDate(0, 1, 0)

	meters, err := s.meterRepo.ListByOwner(userID)
	if err != nil {
		return nil, err
	}

	report := &model.MonthlyReport{
		Period:      from.Format("2006-01"),
		GeneratedAt: time.Now(),
		Rows:        []*model.MonthlyReportRow{},
	}

	for _, m := range meters {
		count, units, amount, err := s.tokenRepo.SpendByMeter(m.ID, from, to)
		if err != nil {
			continue
		}
		if count == 0 && units == 0 && amount == 0 {
			report.Rows = append(report.Rows, &model.MonthlyReportRow{
				MeterID:     m.ID,
				MeterName:   meterDisplayName(m),
				MeterNumber: m.MeterNumber,
			})
			continue
		}
		row := &model.MonthlyReportRow{
			MeterID:     m.ID,
			MeterName:   meterDisplayName(m),
			MeterNumber: m.MeterNumber,
			Tokens:      count,
			UnitsKwh:    round2(units),
			SpendKsh:    round2(amount),
		}
		if units > 0 {
			row.AvgRateKsh = round2(amount / units)
		}
		report.Rows = append(report.Rows, row)
		report.Totals.Tokens += count
		report.Totals.UnitsKwh += units
		report.Totals.SpendKsh += amount
	}
	report.Totals.UnitsKwh = round2(report.Totals.UnitsKwh)
	report.Totals.SpendKsh = round2(report.Totals.SpendKsh)

	return report, nil
}

// parsePeriod validates a YYYY-MM string and returns the first day of that month.
func parsePeriod(period string) (time.Time, error) {
	p := strings.TrimSpace(period)
	if p == "" {
		p = time.Now().Format("2006-01")
	}
	t, err := time.Parse("2006-01", p)
	if err != nil {
		return time.Time{}, fmt.Errorf("period must be in YYYY-MM format, e.g. 2026-09")
	}
	return t, nil
}
