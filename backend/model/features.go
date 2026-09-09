package model

import "time"

// ── Power Reserve, Emergency Power Requests & Green Score ────────────────────

// ReserveView is the payload for the meter power-reserve endpoints.
type ReserveView struct {
	MeterID        string    `json:"meter_id"`
	UnitsRemaining float64   `json:"units_remaining"`
	ReservedKwh    float64   `json:"reserved_kwh"`
	AvailableKwh   float64   `json:"available_kwh"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// SetReserveRequest is the payload for PUT /api/meter/reserve.
type SetReserveRequest struct {
	ReservedKwh float64 `json:"reserved_kwh"`
}

// PowerRequest is a public "I need power" help request.
type PowerRequest struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	RequesterName string     `json:"requester_name,omitempty"`
	MeterAccount  string     `json:"meter_account"`
	AmountKsh     int        `json:"amount_ksh"`
	Note          string     `json:"note"`
	Status        string     `json:"status"` // "open" | "fulfilled" | "cancelled"
	FulfilledBy   string     `json:"fulfilled_by"`
	HelperName    string     `json:"helper_name,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	FulfilledAt   *time.Time `json:"fulfilled_at"`
}

// CreatePowerRequestRequest asks for emergency power help.
type CreatePowerRequestRequest struct {
	AmountKsh int    `json:"amount_ksh"`
	Note      string `json:"note"`
}

// PowerRequestBundle is the response for GET /api/power-requests.
type PowerRequestBundle struct {
	Open []*PowerRequest `json:"open"`
	Mine []*PowerRequest `json:"mine"`
}

// PowerRequestFulfillment is the result of helping someone.
type PowerRequestFulfillment struct {
	Request *PowerRequest `json:"request"`
	Token   *Token        `json:"token"`
}

// GreenScore is the monthly efficiency/impact score for the primary meter.
type GreenScore struct {
	Score         int     `json:"score"`
	Grade         string  `json:"grade"` // A+ .. F
	UsageChangePct float64 `json:"usage_change_pct"` // vs previous ~30 days
	Points        int     `json:"points"`
	CarbonKgMonth float64 `json:"carbon_kg_month"`
}

// NeighborhoodRow is one neighborhood on the local energy-challenge board.
type NeighborhoodRow struct {
	Name    string `json:"name"`
	Points  int    `json:"points"`
	Members int    `json:"members"`
}

// NeighborhoodLeaderboard wraps the ranked neighborhoods plus the caller's hood.
type NeighborhoodLeaderboard struct {
	Rows     []*NeighborhoodRow `json:"rows"`
	MyHood   string             `json:"my_hood"`
	MyRank   int                `json:"my_rank"`
}

// SetNeighborhoodRequest is the payload for PUT /api/profile/neighborhood.
type SetNeighborhoodRequest struct {
	Neighborhood string `json:"neighborhood"`
}
