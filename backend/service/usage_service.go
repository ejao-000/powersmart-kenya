package service

import (
	"sort"
	"time"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// AssumedTariffKsh is the default tariff used to estimate electricity cost.
// It is an approximation of the domestic Kenya Power tariff (incl. levies) and
// is clearly labelled as an estimate in the UI. A production adapter would pull
// the live tariff from a TariffProvider instead.
const AssumedTariffKsh = 15.18

// UsageService aggregates consumption readings into the daily/weekly/monthly
// figures shown on the tenant Usage dashboard and the balance hero.
type UsageService struct {
	meterRepo *repositories.MeterRepo
}

func NewUsageService(meterRepo *repositories.MeterRepo) *UsageService {
	return &UsageService{meterRepo: meterRepo}
}

// Summarize builds a UsageSummary for the user's primary meter.
//
// Consumption is derived from consecutive telemetry readings (a drop in
// units_remaining between two samples = units used in that interval). When there
// is not enough history we fall back to an estimate based on the meter's rolling
// daily average and mark the data quality as "low".
func (s *UsageService) Summarize(userID string) (*model.UsageSummary, error) {
	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	since := now.AddDate(0, -1, 0) // last ~30 days
	history, err := s.meterRepo.GetHistorySince(meter.ID, since)
	if err != nil {
		return nil, err
	}

	daily := s.dailySeries(history, meter, now)
	if daily == nil {
		daily = []*model.UsageDay{}
	}

	// Build a map of ISO date → kWh for today/week/month aggregation.
	byDate := map[string]float64{}
	for _, d := range daily {
		byDate[d.Date] = d.Kwh
	}

	todayKey := now.Format("2006-01-02")
	todayKwh := byDate[todayKey]

	weekStart := now.AddDate(0, 0, -6).Format("2006-01-02")
	var weekKwh float64
	for k, v := range byDate {
		if k >= weekStart {
			weekKwh += v
		}
	}

	monthStart := now.AddDate(0, 0, -29).Format("2006-01-02")
	var monthKwh float64
	for k, v := range byDate {
		if k >= monthStart {
			monthKwh += v
		}
	}

	quality := "high"
	if len(history) < 2 {
		quality = "low"
	}

	return &model.UsageSummary{
		TodayKwh:     round1(todayKwh),
		TodayCostKsh: round2(todayKwh * AssumedTariffKsh),
		WeekKwh:      round1(weekKwh),
		WeekCostKsh:  round2(weekKwh * AssumedTariffKsh),
		MonthKwh:     round1(monthKwh),
		MonthCostKsh: round2(monthKwh * AssumedTariffKsh),
		DailyAvgKwh:  round2(meter.DailyAvgUnits),
		TariffKsh:    AssumedTariffKsh,
		Daily:        daily,
		DataQuality:  quality,
		GeneratedAt:  now,
	}, nil
}

// dailySeries returns one UsageDay per calendar day for the last 30 days.
//
// For each consecutive pair of readings we treat the drop in units as
// consumption attributed to the day of the newer reading. If we have fewer than
// two samples we estimate each day from the meter's daily average instead.
func (s *UsageService) dailySeries(history []*model.UsageHistory, meter *model.Meter, now time.Time) []*model.UsageDay {
	// Copy + sort ascending (repo already returns ascending, but be safe).
	sorted := make([]*model.UsageHistory, len(history))
	copy(sorted, history)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].RecordedAt.Before(sorted[j].RecordedAt)
	})

	consumption := map[string]float64{}
	if len(sorted) >= 2 {
		for i := 1; i < len(sorted); i++ {
			prev, curr := sorted[i-1], sorted[i]
			diff := prev.UnitsRemaining - curr.UnitsRemaining
			if diff <= 0 {
				continue // top-up or reset — skip
			}
			key := curr.RecordedAt.Format("2006-01-02")
			consumption[key] += diff
		}
	}

	// Build the 30-day window, oldest → newest.
	start := now.AddDate(0, 0, -29)
	var daily []*model.UsageDay
	for day := 0; day < 30; day++ {
		t := start.AddDate(0, 0, day)
		key := t.Format("2006-01-02")
		kwh := consumption[key]
		if len(sorted) < 2 && meter.DailyAvgUnits > 0 {
			// Estimate every day from the rolling average when history is thin.
			kwh = meter.DailyAvgUnits
		}
		daily = append(daily, &model.UsageDay{
			Date:    key,
			Kwh:     round2(kwh),
			CostKsh: round2(kwh * AssumedTariffKsh),
		})
	}
	return daily
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
