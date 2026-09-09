package model

import "time"

// ── Landlord Intelligence ────────────────────────────────────────────────────
//
// Powers the landlord-facing unit comparison, unusual-usage (anomaly / theft)
// detection and automatic monthly expense reports. Everything is computed on
// demand from recorded telemetry and token purchases — no extra tables needed.

// MeterAnomaly describes a detected unusual usage pattern on a single meter.
type MeterAnomaly struct {
	Severity string `json:"severity"` // "critical" | "warning" | "info"
	Title    string `json:"title"`
	Reason   string `json:"reason"`
	Action   string `json:"action"`
}

// UnitInsight is one rental unit's health summary used for cross-unit comparison.
type UnitInsight struct {
	MeterID        string        `json:"meter_id"`
	MeterName      string        `json:"meter_name"`
	MeterNumber    string        `json:"meter_number"`
	UnitsRemaining float64       `json:"units_remaining"`
	DailyAvgKwh    float64       `json:"daily_avg_kwh"`
	MonthKwh       float64       `json:"month_kwh"`
	MonthCostKsh   float64       `json:"month_cost_ksh"`
	Last7Kwh       float64       `json:"last_7_kwh"`
	Prev7Kwh       float64       `json:"prev_7_kwh"`
	ChangePct      float64       `json:"change_pct"`
	Anomaly        *MeterAnomaly `json:"anomaly"` // nil when nothing unusual detected
}

// InsightsBundle is the aggregate response for GET /api/insights.
type InsightsBundle struct {
	Units          []*UnitInsight `json:"units"`
	FlaggedCount   int            `json:"flagged_count"`
	TotalMonthCost float64        `json:"total_month_cost_ksh"`
	TotalMonthKwh  float64        `json:"total_month_kwh"`
	GeneratedAt    time.Time      `json:"generated_at"`
}

// MonthlyReportRow is one meter's spend for a calendar month.
type MonthlyReportRow struct {
	MeterID     string  `json:"meter_id"`
	MeterName   string  `json:"meter_name"`
	MeterNumber string  `json:"meter_number"`
	Tokens      int     `json:"tokens"`
	UnitsKwh    float64 `json:"units_kwh"`
	SpendKsh    float64 `json:"spend_ksh"`
	AvgRateKsh  float64 `json:"avg_rate_ksh"` // spend per kWh (KSh)
}

// MonthlyReportTotals summarises the whole portfolio for the period.
type MonthlyReportTotals struct {
	Tokens   int     `json:"tokens"`
	UnitsKwh float64 `json:"units_kwh"`
	SpendKsh float64 `json:"spend_ksh"`
}

// MonthlyReport is the payload for GET /api/reports/monthly?month=YYYY-MM.
type MonthlyReport struct {
	Period      string              `json:"period"`
	GeneratedAt time.Time           `json:"generated_at"`
	Rows        []*MonthlyReportRow `json:"rows"`
	Totals      MonthlyReportTotals `json:"totals"`
}
