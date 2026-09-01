package model

import "time"

// UsageDay is a single day of consumption in the usage dashboard series.
type UsageDay struct {
	Date   string  `json:"date"`   // ISO date (YYYY-MM-DD)
	Kwh    float64 `json:"kwh"`    // units consumed that day
	CostKsh float64 `json:"cost_ksh"` // estimated cost at the current tariff
}

// UsageSummary is the response for GET /api/meter/usage.
type UsageSummary struct {
	TodayKwh     float64     `json:"today_kwh"`
	TodayCostKsh float64     `json:"today_cost_ksh"`
	WeekKwh      float64     `json:"week_kwh"`
	WeekCostKsh  float64     `json:"week_cost_ksh"`
	MonthKwh     float64     `json:"month_kwh"`
	MonthCostKsh float64     `json:"month_cost_ksh"`
	DailyAvgKwh  float64     `json:"daily_avg_kwh"`
	TariffKsh    float64     `json:"tariff_ksh"`     // assumed tariff (KES / kWh)
	Daily        []*UsageDay `json:"daily"`          // last 30 days, oldest → newest
	DataQuality  string      `json:"data_quality"`   // "high" | "low" (based on history depth)
	GeneratedAt  time.Time   `json:"generated_at"`
}
