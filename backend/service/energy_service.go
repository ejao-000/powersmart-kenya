package service

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// Sentinel errors surfaced to the handlers so they can map HTTP status codes.
var (
	ErrForbidden = errors.New("not authorized")
	ErrInvalid   = errors.New("invalid input")
)

// DefaultBudgetKsh is the budget placeholder shown until a user saves their own
// monthly target (matches the old front-end prototype default).
const DefaultBudgetKsh = 2000

// DaysPerMonth is the calendar length used for full-month spend projections.
const DaysPerMonth = 30

// EnergyService powers the "PowerSmart Energy Intelligence" hub:
//
//   - Budget planner — the user sets a monthly KSh target; we project the month
//     at the current usage pace and warn before they exceed it.
//   - Appliance insights — registered appliances (watts × hours/day) are turned
//     into estimated kWh/day, cost and share of measured usage.
//   - AI energy coach — rules over the telemetry detect usage jumps, flag the
//     biggest loads, point at water heaters/geysers and recommend savings.
type EnergyService struct {
	energyRepo *repositories.EnergyRepo
	meterRepo  *repositories.MeterRepo
	usageSvc   *UsageService
	predSvc    *PredictionService
}

func NewEnergyService(
	energyRepo *repositories.EnergyRepo,
	meterRepo *repositories.MeterRepo,
	usageSvc *UsageService,
	predSvc *PredictionService,
) *EnergyService {
	return &EnergyService{
		energyRepo: energyRepo,
		meterRepo:  meterRepo,
		usageSvc:   usageSvc,
		predSvc:    predSvc,
	}
}

// resolveMeter returns the requested meter when it belongs to the user, or the
// user's primary meter when no meter_id is supplied.
func (s *EnergyService) resolveMeter(userID, meterID string) (*model.Meter, error) {
	if meterID != "" {
		return s.meterRepo.GetByIDForUser(meterID, userID)
	}
	return s.meterRepo.GetByUserID(userID)
}

func (s *EnergyService) meterLabel(m *model.Meter) string {
	if strings.TrimSpace(m.Name) != "" {
		return m.Name
	}
	if m.MeterNumber != "" {
		return m.MeterNumber
	}
	return "Meter"
}

// Intel assembles the full Energy Intelligence payload for one meter.
func (s *EnergyService) Intel(userID, meterIDParam string) (*model.EnergyIntel, error) {
	meter, err := s.resolveMeter(userID, meterIDParam)
	if err != nil {
		return nil, err
	}

	usage, err := s.usageSvc.SummarizeMeter(meter)
	if err != nil {
		return nil, err
	}

	appliances, err := s.energyRepo.ListAppliances(meter.ID)
	if err != nil {
		return nil, err
	}
	if appliances == nil {
		appliances = []*model.EnergyAppliance{}
	}

	budget, _ := s.energyRepo.GetBudgetByMeter(meter.ID) // nil row is fine

	intel := &model.EnergyIntel{
		MeterID:        meter.ID,
		MeterName:      s.meterLabel(meter),
		TariffKsh:      AssumedTariffKsh,
		UnitsRemaining: meter.UnitsRemaining,
		Usage:          usage,
		Appliances:     appliances,
		GeneratedAt:    time.Now(),
	}

	if pred, err := s.predSvc.Predict(meter); err == nil && pred != nil {
		intel.DaysRemaining = pred.DaysRemaining
		intel.DepletionDate = pred.DepletionDate
		intel.ConfidenceLevel = pred.ConfidenceLevel
		intel.RecommendedTopupKsh = pred.RecommendedTopup
	}

	s.enrichAppliances(appliances, usage)
	intel.Forecast = s.buildForecast(usage)
	intel.Budget = s.budgetConfig(budget, usage)
	s.applyBudgetToForecast(&intel.Forecast, intel.Budget.MonthlyBudgetKsh)
	intel.ModelCoveragePct = s.modelCoverage(appliances, usage)
	intel.Coach = s.buildCoach(appliances, usage, intel.Budget, intel.Forecast)

	return intel, nil
}

// SaveBudget validates and persists a monthly budget for a meter the user owns.
func (s *EnergyService) SaveBudget(userID, meterID string, amount float64) (*model.EnergyBudget, error) {
	if amount < 100 {
		return nil, fmt.Errorf("%w: monthly budget must be at least KSh 100", ErrInvalid)
	}
	if amount > 5_000_000 {
		return nil, fmt.Errorf("%w: monthly budget exceeds the maximum of KSh 5,000,000", ErrInvalid)
	}
	meter, err := s.resolveMeter(userID, meterID)
	if err != nil {
		return nil, err
	}
	return s.energyRepo.UpsertBudget(uuid.NewString(), meter.ID, amount)
}

// ListAppliances returns the appliances registered to an owned meter.
func (s *EnergyService) ListAppliances(userID, meterID string) ([]*model.EnergyAppliance, error) {
	meter, err := s.resolveMeter(userID, meterID)
	if err != nil {
		return nil, err
	}
	list, err := s.energyRepo.ListAppliances(meter.ID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []*model.EnergyAppliance{}
	}
	return list, nil
}

// CreateAppliance registers a new appliance against an owned meter.
func (s *EnergyService) CreateAppliance(userID string, req *model.ApplianceRequest) (*model.EnergyAppliance, error) {
	if err := validateAppliance(req.Name, req.Watts, req.HoursPerDay); err != nil {
		return nil, err
	}
	meter, err := s.resolveMeter(userID, req.MeterID)
	if err != nil {
		return nil, err
	}
	a := &model.EnergyAppliance{
		ID:          uuid.NewString(),
		MeterID:     meter.ID,
		Name:        strings.TrimSpace(req.Name),
		Watts:       req.Watts,
		HoursPerDay: req.HoursPerDay,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.energyRepo.CreateAppliance(a); err != nil {
		return nil, err
	}
	return a, nil
}

// UpdateAppliance applies a partial patch to one of the user's appliances.
func (s *EnergyService) UpdateAppliance(userID, appID string, patch *model.AppliancePatch) (*model.EnergyAppliance, error) {
	app, err := s.energyRepo.GetApplianceByID(appID)
	if err != nil {
		return nil, err
	}

	// Verify the appliance's meter belongs to the caller.
	if _, err := s.meterRepo.GetByIDForUser(app.MeterID, userID); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, fmt.Errorf("%w: this appliance belongs to another account", ErrForbidden)
		}
		return nil, err
	}

	if patch.Name != nil {
		app.Name = *patch.Name
	}
	if patch.Watts != nil {
		app.Watts = *patch.Watts
	}
	if patch.HoursPerDay != nil {
		app.HoursPerDay = *patch.HoursPerDay
	}
	if err := validateAppliance(app.Name, app.Watts, app.HoursPerDay); err != nil {
		return nil, err
	}
	app.Name = strings.TrimSpace(app.Name)

	if err := s.energyRepo.UpdateAppliance(app); err != nil {
		return nil, err
	}
	return app, nil
}

// DeleteAppliance removes an appliance the user owns.
func (s *EnergyService) DeleteAppliance(userID, appID string) error {
	app, err := s.energyRepo.GetApplianceByID(appID)
	if err != nil {
		return err
	}
	if _, err := s.meterRepo.GetByIDForUser(app.MeterID, userID); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return fmt.Errorf("%w: this appliance belongs to another account", ErrForbidden)
		}
		return err
	}
	return s.energyRepo.DeleteAppliance(appID)
}

// ── Computation helpers ──────────────────────────────────────────────────────

// estimateAppliance fills in the derived kWh / cost / share fields.
func estimateAppliance(a *model.EnergyAppliance, tariff float64) {
	daily := (a.Watts * a.HoursPerDay) / 1000
	monthly := daily * DaysPerMonth
	a.DailyKwh = round2(daily)
	a.MonthlyKwh = round2(monthly)
	a.DailyCostKsh = round2(daily * tariff)
	a.MonthlyCostKsh = round2(monthly * tariff)
	a.SharePct = 0 // set by the caller once the measured month usage is known
}

func (s *EnergyService) enrichAppliances(appliances []*model.EnergyAppliance, usage *model.UsageSummary) {
	for _, a := range appliances {
		estimateAppliance(a, AssumedTariffKsh)
		if usage != nil && usage.MonthKwh > 0 {
			a.SharePct = math.Round(a.MonthlyKwh / usage.MonthKwh * 100)
			if a.SharePct > 100 {
				a.SharePct = 100
			}
		}
	}
}

func (s *EnergyService) modeledMonthlyKwh(appliances []*model.EnergyAppliance) float64 {
	var total float64
	for _, a := range appliances {
		total += a.MonthlyKwh
	}
	return total
}

func (s *EnergyService) modelCoverage(appliances []*model.EnergyAppliance, usage *model.UsageSummary) float64 {
	if usage == nil || usage.MonthKwh <= 0 {
		return 0
	}
	coverage := s.modeledMonthlyKwh(appliances) / usage.MonthKwh * 100
	if coverage > 100 {
		coverage = 100
	}
	return math.Round(coverage)
}

// budgetConfig resolves the active budget. When none has been saved yet it falls
// back to a data-driven suggestion (previous spend rounded up to KSh 100).
func (s *EnergyService) budgetConfig(budget *model.EnergyBudget, usage *model.UsageSummary) model.BudgetConfig {
	cfg := model.BudgetConfig{}
	if budget != nil {
		cfg.Configured = true
		cfg.MonthlyBudgetKsh = budget.MonthlyBudgetKsh
		return cfg
	}

	suggested := float64(DefaultBudgetKsh)
	if usage != nil && usage.MonthCostKsh > 0 {
		suggested = math.Ceil(usage.MonthCostKsh/100) * 100
		if suggested < 500 {
			suggested = 500
		}
	}
	cfg.Configured = false
	cfg.SuggestedKsh = suggested
	cfg.MonthlyBudgetKsh = suggested
	return cfg
}

// dailyCostPace estimates KSh spent per day from the last ~30 days.
func (s *EnergyService) dailyCostPace(usage *model.UsageSummary) float64 {
	if usage == nil {
		return 0
	}
	if usage.MonthCostKsh > 0 {
		return usage.MonthCostKsh / DaysPerMonth
	}
	return usage.DailyAvgKwh * AssumedTariffKsh
}

func daysInCurrentMonth(t time.Time) int {
	first := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	next := first.AddDate(0, 1, 0)
	return int(next.Sub(first).Hours() / 24)
}

func (s *EnergyService) buildForecast(usage *model.UsageSummary) model.SpendForecast {
	f := model.SpendForecast{}
	if usage == nil {
		f.Status = "ok"
		return f
	}

	lastCost := usage.MonthCostKsh
	days := float64(daysInCurrentMonth(time.Now()))
	projCost := s.dailyCostPace(usage) * days
	projKwh := 0.0
	if AssumedTariffKsh > 0 && usage.MonthKwh > 0 {
		projKwh = round2(usage.MonthKwh / DaysPerMonth * days)
	}

	f.LastPeriodCostKsh = round2(lastCost)
	f.ProjectedMonthCostKsh = round2(projCost)
	f.ProjectedMonthKwh = projKwh
	f.DeltaKsh = round2(projCost - lastCost)
	if lastCost > 0 {
		f.DeltaPct = round2((projCost - lastCost) / lastCost * 100)
	}

	// Budget thresholds are applied later (budget is independent of usage).
	f.OverrunKsh = 0
	f.BudgetUsedPct = 0
	f.Status = "ok"
	return f
}

func (s *EnergyService) applyBudgetToForecast(f *model.SpendForecast, budgetKsh float64) {
	f.OverrunKsh = round2(f.ProjectedMonthCostKsh - budgetKsh)
	if budgetKsh > 0 {
		f.BudgetUsedPct = math.Round(f.ProjectedMonthCostKsh / budgetKsh * 100)
	}
	switch {
	case f.BudgetUsedPct > 100:
		f.Status = "critical"
	case f.BudgetUsedPct >= 85:
		f.Status = "warning"
	default:
		f.Status = "ok"
	}
}

// weekOverWeek returns (thisWeekKwh, lastWeekKwh, thisWeekCost) from the 30-day
// series when at least 14 days are available.
func weekOverWeek(usage *model.UsageSummary) (float64, float64, float64, bool) {
	if usage == nil || usage.Daily == nil || len(usage.Daily) < 14 {
		return 0, 0, 0, false
	}
	daily := usage.Daily
	total := len(daily)
	var last, prev float64
	for i := total - 7; i < total; i++ {
		last += daily[i].Kwh
	}
	for i := total - 14; i < total-7; i++ {
		prev += daily[i].Kwh
	}
	return round2(last), round2(prev), round2(last * AssumedTariffKsh), true
}

// ── AI Energy Coach ──────────────────────────────────────────────────────────

func (s *EnergyService) buildCoach(
	appliances []*model.EnergyAppliance,
	usage *model.UsageSummary,
	budget model.BudgetConfig,
	forecast model.SpendForecast,
) []model.CoachInsight {
	insights := []model.CoachInsight{}

	if usage == nil {
		return insights
	}

	// 1) Week-over-week anomaly detection.
	if last, prev, cost, ok := weekOverWeek(usage); ok && prev > 0 {
		change := (last - prev) / prev * 100
		switch {
		case change >= 15:
			insights = append(insights, model.CoachInsight{
				Severity: "warning",
				Title:    fmt.Sprintf("Usage jumped %.0f%% this week", change),
				Message: fmt.Sprintf(
					"You used %s kWh in the last 7 days vs %s kWh the week before — about %s more. A longer-running geyser, heater or a new appliance are the usual suspects.",
					fmtUnitsPlain(last), fmtUnitsPlain(prev), fmtKshPlain(cost),
				),
			})
		case change <= -15:
			insights = append(insights, model.CoachInsight{
				Severity: "success",
				Title:    "Great progress — usage is down",
				Message: fmt.Sprintf(
					"You used %s kWh in the last 7 days, about %.0f%% less than the week before. Keep doing whatever you changed.",
					fmtUnitsPlain(last), math.Abs(change),
				),
			})
		}
	}

	// 2) High absolute usage → check the water heater / geyser.
	if usage.DailyAvgKwh >= 15 {
		insights = append(insights, model.CoachInsight{
			Severity: "warning",
			Title:    fmt.Sprintf("High usage — about %.1f kWh/day", usage.DailyAvgKwh),
			Message:  "That is roughly double the average Kenyan household. Check whether a geyser or water heater was left on, and trim it by 20 minutes a day.",
		})
	}

	// 3) Budget overrun projection.
	if budget.Configured {
		switch forecast.Status {
		case "critical":
			insights = append(insights, model.CoachInsight{
				Severity: "critical",
				Title:    "On track to blow your monthly budget",
				Message: fmt.Sprintf(
					"At the current pace you will spend about %s — %s over your %s/month target.",
					fmtKshPlain(forecast.ProjectedMonthCostKsh), fmtKshPlain(forecast.OverrunKsh), fmtKshPlain(budget.MonthlyBudgetKsh),
				),
			})
		case "warning":
			insights = append(insights, model.CoachInsight{
				Severity: "info",
				Title:    "Nearing your monthly budget",
				Message: fmt.Sprintf(
					"You are projected to use about %.0f%% of your %s/month budget. A small cut now keeps you under.",
					forecast.BudgetUsedPct, fmtKshPlain(budget.MonthlyBudgetKsh),
				),
			})
		}
	} else if usage.MonthCostKsh > 0 {
		insights = append(insights, model.CoachInsight{
			Severity: "info",
			Title:    "Set a monthly budget target",
			Message: fmt.Sprintf(
				"You spent about %s in the last 30 days. Set a monthly budget and we'll warn you before you exceed it.",
				fmtKshPlain(usage.MonthCostKsh),
			),
		})
	}

	// 4) Appliance model — point at the biggest load / water heating.
	if len(appliances) > 0 {
		heaviest := appliances[0]
		for _, a := range appliances {
			if a.MonthlyCostKsh > heaviest.MonthlyCostKsh {
				heaviest = a
			}
		}

		if heaviest.MonthlyCostKsh > 0 {
			halfHours := heaviest.HoursPerDay * 0.5
			saving := (heaviest.Watts * halfHours / 1000) * DaysPerMonth * AssumedTariffKsh
			isWaterHeat := nameHintsWater(heaviest.Name)
			severity := "info"
			if isWaterHeat {
				severity = "warning"
			}
			insights = append(insights, model.CoachInsight{
				Severity: severity,
				Title:    fmt.Sprintf("Your %s is your biggest load", heaviest.Name),
				Message: fmt.Sprintf(
					"Estimated at ~%.0f%% of your usage (%s/month). Cutting it from %.0f to ~%.0f hours a day could save about %s every month.",
					heaviest.SharePct, fmtKshPlain(heaviest.MonthlyCostKsh),
					heaviest.HoursPerDay, heaviest.HoursPerDay-halfHours,
					fmtKshPlain(saving),
				),
			})
		}

		if hasOffPeakCandidate(appliances) {
			insights = append(insights, model.CoachInsight{
				Severity: "info",
				Title:    "Shift big loads to off-peak",
				Message:  "Run the washing machine, iron or kettle between 9pm and 6am — off-peak rates make the same power cost less.",
			})
		}
	} else if usage.MonthKwh > 0 {
		insights = append(insights, model.CoachInsight{
			Severity: "info",
			Title:    "Add your appliances to see where power goes",
			Message:  "Register your fridge, TV, heater and lights and PowerSmart will estimate each one's share of your bill and coach you on what to trim first.",
		})
	}

	// 5) Thin data → encourage a sync / reading.
	if usage.DataQuality == "low" || (usage.MonthKwh <= 0 && usage.DailyAvgKwh <= 0) {
		insights = append(insights, model.CoachInsight{
			Severity: "info",
			Title:    "Syncing your meter sharpens this",
			Message:  "Connect via WiFi/Bluetooth or record a meter reading to unlock accurate usage forecasts and personalised tips.",
		})
	}

	return insights
}

func nameHintsWater(name string) bool {
	lower := strings.ToLower(name)
	for _, kw := range []string{"heater", "geyser", "immersion", "boiler", "kettle"} {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func hasOffPeakCandidate(appliances []*model.EnergyAppliance) bool {
	for _, a := range appliances {
		lower := strings.ToLower(a.Name)
		if strings.Contains(lower, "washing") || strings.Contains(lower, "iron") ||
			strings.Contains(lower, "kettle") || strings.Contains(lower, "dishwasher") {
			return true
		}
	}
	return false
}

func validateAppliance(name string, watts, hours float64) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("%w: appliance name is required", ErrInvalid)
	}
	if len(name) > 60 {
		return fmt.Errorf("%w: appliance name is too long (max 60 characters)", ErrInvalid)
	}
	if watts <= 0 || watts > 20_000 {
		return fmt.Errorf("%w: power rating must be between 1 and 20,000 watts", ErrInvalid)
	}
	if hours < 0 || hours > 24 {
		return fmt.Errorf("%w: hours per day must be between 0 and 24", ErrInvalid)
	}
	return nil
}

// trimFloat renders a float with up to one decimal place, dropping a trailing
// ".0" and rounding away sub-cent noise.
func trimFloat(v float64) string {
	r := round1(v)
	if math.Abs(r-math.Round(r)) < 0.05 {
		return fmt.Sprintf("%.0f", math.Round(r))
	}
	return fmt.Sprintf("%.1f", r)
}

func fmtKshPlain(v float64) string {
	return "KSh " + trimFloat(v)
}

func fmtUnitsPlain(v float64) string {
	return trimFloat(v) + " kWh"
}
