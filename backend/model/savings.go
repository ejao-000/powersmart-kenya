package model

import "time"

// ── Savings & Impact ─────────────────────────────────────────────────────────
//
// Backs the "Savings Hub": reduction goals, weekly energy-saving challenges with
// points + a global leaderboard, and a carbon footprint estimate derived from
// recorded usage.

// SavingsGoal tracks a user's target to reduce their monthly electricity spend.
type SavingsGoal struct {
	ID          string     `json:"id"`
	MeterID     string     `json:"meter_id"`
	MeterName   string     `json:"meter_name,omitempty"` // joined for display
	Label       string     `json:"label"`
	BaselineKsh float64    `json:"baseline_ksh"`           // monthly spend when the goal was set
	TargetKsh   float64    `json:"target_ksh"`             // monthly spend the user is aiming for
	CurrentKsh  float64    `json:"current_ksh,omitempty"`  // latest rolling spend — computed
	ProgressPct float64    `json:"progress_pct,omitempty"` // 0-100 — computed
	Active      bool       `json:"active"`
	Achieved    bool       `json:"achieved"`
	CreatedAt   time.Time  `json:"created_at"`
	AchievedAt  *time.Time `json:"achieved_at"`
}

// CreateGoalRequest starts a new savings goal.
type CreateGoalRequest struct {
	MeterID   string  `json:"meter_id"` // optional — defaults to primary meter
	TargetKsh float64 `json:"target_ksh"`
	Label     string  `json:"label"` // optional
}

// Challenge is one weekly, points-earning energy-saving goal.
type Challenge struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Points      int    `json:"points"`
	Achieved    bool   `json:"achieved"` // already claimed this week
	Status      string `json:"status"`   // "done" | "open" | "no_data" | "no_budget"
	Message     string `json:"message,omitempty"`
}

// LeaderboardRow is one user's total on the savings leaderboard.
type LeaderboardRow struct {
	UserName string `json:"user_name"`
	Points   int    `json:"points"`
	Claims   int    `json:"claims"`
}

// LeaderboardResponse wraps the top list plus the caller's own position.
type LeaderboardResponse struct {
	Rows     []*LeaderboardRow `json:"rows"`
	MyName   string            `json:"my_name"`
	MyPoints int               `json:"my_points"`
	MyRank   int               `json:"my_rank"`
	MyClaims int               `json:"my_claims"`
}

// CarbonSummary estimates CO₂ from electricity for the primary meter.
type CarbonSummary struct {
	FactorKgPerKwh float64 `json:"factor_kg_per_kwh"`
	TodayKg        float64 `json:"today_kg"`
	WeekKg         float64 `json:"week_kg"`
	MonthKg        float64 `json:"month_kg"`
	TreesMonthly   float64 `json:"trees_monthly"` // mature trees needed to offset a month
}
