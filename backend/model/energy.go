package model

import "time"

// ── Energy Intelligence ──────────────────────────────────────────────────────
//
// These types back the "PowerSmart Energy Intelligence" hub: a combined
// budget planner, appliance model and AI energy coach. It answers "where is my
// electricity going, why did my usage change, how much am I likely to spend and
// what can I do to save?" for a single meter.

// EnergyBudget stores a user-set monthly electricity spend target for one meter
// (at most one row per meter — meter_id is UNIQUE).
type EnergyBudget struct {
	ID               string    `json:"id"`
	MeterID          string    `json:"meter_id"`
	MonthlyBudgetKsh float64   `json:"monthly_budget_ksh"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// EnergyAppliance is a registered appliance used to model household consumption.
// The computed estimate fields are filled in by the service layer and are safe
// to ignore when scanning rows out of the database.
type EnergyAppliance struct {
	ID          string    `json:"id"`
	MeterID     string    `json:"meter_id"`
	Name        string    `json:"name"`
	Watts       float64   `json:"watts"`
	HoursPerDay float64   `json:"hours_per_day"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Computed estimates (service-populated):
	DailyKwh       float64 `json:"daily_kwh"`
	MonthlyKwh     float64 `json:"monthly_kwh"`
	DailyCostKsh   float64 `json:"daily_cost_ksh"`
	MonthlyCostKsh float64 `json:"monthly_cost_ksh"`
	SharePct       float64 `json:"share_pct"` // share of measured monthly usage (0-100)
}

// SaveBudgetRequest is the payload for PUT /api/energy/budget.
type SaveBudgetRequest struct {
	MeterID          string  `json:"meter_id"`
	MonthlyBudgetKsh float64 `json:"monthly_budget_ksh"`
}

// ApplianceRequest is the payload for POST /api/energy/appliances.
type ApplianceRequest struct {
	MeterID     string  `json:"meter_id"`
	Name        string  `json:"name"`
	Watts       float64 `json:"watts"`
	HoursPerDay float64 `json:"hours_per_day"`
}

// AppliancePatch is the partial payload for PUT /api/energy/appliances/{id}.
// Only non-nil fields are applied.
type AppliancePatch struct {
	Name        *string  `json:"name"`
	Watts       *float64 `json:"watts"`
	HoursPerDay *float64 `json:"hours_per_day"`
}

// BudgetConfig describes the active budget in the intel bundle.
type BudgetConfig struct {
	MonthlyBudgetKsh float64 `json:"monthly_budget_ksh"` // active value (saved or suggested)
	Configured       bool    `json:"configured"`         // true once the user has saved a budget
	SuggestedKsh     float64 `json:"suggested_ksh"`      // data-driven suggestion when not configured
}

// SpendForecast projects this month's spend from the recent usage pace.
type SpendForecast struct {
	ProjectedMonthKwh     float64 `json:"projected_month_kwh"`
	ProjectedMonthCostKsh float64 `json:"projected_month_cost_ksh"`
	LastPeriodCostKsh     float64 `json:"last_period_cost_ksh"` // last ~30 days spend
	DeltaKsh              float64 `json:"delta_ksh"`            // projected vs last period
	DeltaPct              float64 `json:"delta_pct"`
	OverrunKsh            float64 `json:"overrun_ksh"` // positive = over budget, negative = to spare
	BudgetUsedPct         float64 `json:"budget_used_pct"`
	Status                string  `json:"status"` // "ok" | "warning" | "critical"
}

// CoachInsight is one note from the AI energy coach.
type CoachInsight struct {
	Severity string `json:"severity"` // "success" | "info" | "warning" | "critical"
	Title    string `json:"title"`
	Message  string `json:"message"`
}

// EnergyIntel is the aggregate payload for GET /api/energy/intel.
type EnergyIntel struct {
	MeterID   string  `json:"meter_id"`
	MeterName string  `json:"meter_name"`
	TariffKsh float64 `json:"tariff_ksh"`

	UnitsRemaining      float64    `json:"units_remaining"`
	DaysRemaining       float64    `json:"days_remaining"`
	DepletionDate       *time.Time `json:"depletion_date"`
	ConfidenceLevel     string     `json:"confidence_level"`
	RecommendedTopupKsh int        `json:"recommended_topup_ksh"`

	Budget           BudgetConfig       `json:"budget"`
	Forecast         SpendForecast      `json:"forecast"`
	Usage            *UsageSummary      `json:"usage"`
	Appliances       []*EnergyAppliance `json:"appliances"`
	ModelCoveragePct float64            `json:"model_coverage_pct"` // modelled kWh / measured month kWh (0-100)
	Coach            []CoachInsight     `json:"coach"`
	GeneratedAt      time.Time          `json:"generated_at"`
}
