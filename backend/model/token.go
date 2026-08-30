package model

import "time"

// PushStatus tracks whether the token has been sent to the physical meter.
type PushStatus string

const (
	PushPending  PushStatus = "pending"
	PushSuccess  PushStatus = "success"
	PushFailed   PushStatus = "failed"
	PushManual   PushStatus = "manual" // user opted to enter manually
)

// PushMethod is how the token was delivered to the meter.
type PushMethod string

const (
	PushMethodBluetooth PushMethod = "bluetooth"
	PushMethodWiFi      PushMethod = "wifi"
)

// Token represents a purchased Kenya Power prepaid token.
type Token struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	MeterID     string     `json:"meter_id"`
	TokenNumber string     `json:"token_number"` // the 20-digit KP token
	Units       float64    `json:"units"`
	AmountKsh   int        `json:"amount_ksh"`
	PaymentRef  string     `json:"payment_ref"`
	PushedAt    *time.Time `json:"pushed_at"`
	PushStatus  PushStatus `json:"push_status"`
	PushMethod  PushMethod `json:"push_method"`
	PurchasedAt time.Time  `json:"purchased_at"`
	Deleted     bool       `json:"-"` // soft delete — omit from API responses
}

// BuyTokenRequest is the payload for POST /api/tokens/buy.
type BuyTokenRequest struct {
	AmountKsh      int    `json:"amount_ksh"    validate:"required,min=50"`
	PaymentChannel string `json:"payment_channel" validate:"required,oneof=mpesa airtel bank"`
	Phone          string `json:"phone"`         // required for mpesa / airtel
	MeterID        string `json:"meter_id"`      // optional — buy for a specific meter (landlord multi-meter)
}

// TransferTokenRequest is the payload for POST /api/tokens/transfer.
// Lets a user send token value to another registered meter account.
type TransferTokenRequest struct {
	MeterAccount string `json:"meter_account" validate:"required"`
	AmountKsh    int    `json:"amount_ksh"    validate:"required,min=50"`
}

// BluetoothPushRequest optionally carries the BLE device ID if already paired.
type BluetoothPushRequest struct {
	DeviceID string `json:"device_id"` // optional — empty means "scan for nearest"
}
