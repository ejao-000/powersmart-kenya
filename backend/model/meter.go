package model

import "time"

// Meter holds the current state of a user's prepaid meter.
type Meter struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	Name            string     `json:"name"`
	MeterNumber     string     `json:"meter_number"`
	UnitsRemaining  float64    `json:"units_remaining"`
	DailyAvgUnits   float64    `json:"daily_avg_units"`
	LastReadingAt   *time.Time `json:"last_reading_at"`
	AutoTopup       bool       `json:"auto_topup"`
	TopupThreshold  float64    `json:"topup_threshold"`
	TopupAmountKsh  int        `json:"topup_amount_ksh"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// AddMeterRequest is the payload for POST /api/meters (landlord / multi-meter owners).
type AddMeterRequest struct {
	Name         string  `json:"name"`          // e.g. "Unit 2 — Dorm", "Kid's room"
	MeterNumber  string  `json:"meter_number"`  // the KP meter number (or account)
	UnitsRemaining float64 `json:"units_remaining"`
}

// TelemetryPayload is POSTed by the frontend (from meter BLE reading or manual input).
type TelemetryPayload struct {
	UnitsRemaining float64 `json:"units_remaining" validate:"required,gte=0"`
}

// MeterSettings allows the user to configure alerts and auto top-up.
type MeterSettings struct {
	AutoTopup      bool    `json:"auto_topup"`
	TopupThreshold float64 `json:"topup_threshold"`
	TopupAmountKsh int     `json:"topup_amount_ksh"`
}

// Prediction is the depletion forecast returned by the prediction service.
type Prediction struct {
	UnitsRemaining   float64    `json:"units_remaining"`
	DailyAvgUnits    float64    `json:"daily_avg_units"`
	DaysRemaining    float64    `json:"days_remaining"`
	DepletionDate    *time.Time `json:"depletion_date"`
	ConfidenceLevel  string     `json:"confidence_level"` // "high" | "medium" | "low"
	AlertLevel       string     `json:"alert_level"`      // "ok" | "warning" | "critical"
	RecommendedTopup int        `json:"recommended_topup_ksh"`
}

// UsageHistory is a single sampled reading stored for trend analysis.
type UsageHistory struct {
	ID             string    `json:"id"`
	MeterID        string    `json:"meter_id"`
	UnitsRemaining float64   `json:"units_remaining"`
	RecordedAt     time.Time `json:"recorded_at"`
}
