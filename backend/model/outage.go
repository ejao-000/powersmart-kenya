package model

import "time"

// OutageStatus tracks the lifecycle of a reported power outage.
type OutageStatus string

const (
	OutageReported  OutageStatus = "reported"
	OutageConfirmed OutageStatus = "confirmed"
	OutageResolved  OutageStatus = "resolved"
)

// Outage is a community power-outage report pinned to a location.
type Outage struct {
	ID           string       `json:"id"`
	UserID       string       `json:"user_id"`
	ReporterName string       `json:"reporter_name,omitempty"`
	Area         string       `json:"area"`
	Latitude     float64      `json:"latitude"`
	Longitude    float64      `json:"longitude"`
	Description  string       `json:"description"`
	Status       OutageStatus `json:"status"`
	CreatedAt    time.Time    `json:"created_at"`
}

// ReportOutageRequest is the payload for POST /api/outages.
type ReportOutageRequest struct {
	Area        string  `json:"area"        validate:"required"`
	Latitude    float64 `json:"latitude"    validate:"required"`
	Longitude   float64 `json:"longitude"   validate:"required"`
	Description string  `json:"description"`
}
