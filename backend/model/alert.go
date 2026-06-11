package model

import "time"

type AlertType string

const (
	AlertLowUnits   AlertType = "low_units"   // e.g. below 10 kWh
	AlertDaysLeft   AlertType = "days_left"   // e.g. less than 3 days
	AlertAutoTopup  AlertType = "auto_topup"  // fired when auto top-up triggers
)

type AlertChannel string

const (
	AlertChannelPush  AlertChannel = "push"
	AlertChannelSMS   AlertChannel = "sms"
	AlertChannelEmail AlertChannel = "email"
)

// Alert is a configurable notification rule per user.
type Alert struct {
	ID          string       `json:"id"`
	UserID      string       `json:"user_id"`
	Type        AlertType    `json:"type"`
	Threshold   float64      `json:"threshold"`  // kWh or days depending on type
	Channel     AlertChannel `json:"channel"`
	Enabled     bool         `json:"enabled"`
	LastFiredAt *time.Time   `json:"last_fired_at"`
	CreatedAt   time.Time    `json:"created_at"`
}

// AlertCreateRequest is the payload for POST /api/alerts.
type AlertCreateRequest struct {
	Type      AlertType    `json:"type"      validate:"required"`
	Threshold float64      `json:"threshold" validate:"required,gt=0"`
	Channel   AlertChannel `json:"channel"   validate:"required"`
}
