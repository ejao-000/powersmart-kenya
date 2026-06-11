package model

import "time"

type PaymentChannel string

const (
	ChannelMpesa  PaymentChannel = "mpesa"
	ChannelAirtel PaymentChannel = "airtel"
	ChannelBank   PaymentChannel = "bank"
)

type TransactionStatus string

const (
	TxPending   TransactionStatus = "pending"
	TxSuccess   TransactionStatus = "success"
	TxFailed    TransactionStatus = "failed"
	TxCancelled TransactionStatus = "cancelled"
)

// Transaction records a payment attempt.
type Transaction struct {
	ID          string            `json:"id"`
	UserID      string            `json:"user_id"`
	TokenID     string            `json:"token_id,omitempty"`
	Channel     PaymentChannel    `json:"channel"`
	Phone       string            `json:"phone,omitempty"`
	AmountKsh   int               `json:"amount_ksh"`
	Reference   string            `json:"reference"`   // internal ref
	ProviderRef string            `json:"provider_ref"` // M-Pesa / Airtel ref
	Status      TransactionStatus `json:"status"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// MpesaSTKRequest is the payload sent to Safaricom Daraja to trigger STK push.
type MpesaSTKRequest struct {
	Phone     string `json:"phone"`
	AmountKsh int    `json:"amount"`
	Reference string `json:"account_reference"`
}

// MpesaCallback is the structure Safaricom sends to our callback URL.
type MpesaCallback struct {
	Body struct {
		STKCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  *struct {
				Item []struct {
					Name  string      `json:"Name"`
					Value interface{} `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}
