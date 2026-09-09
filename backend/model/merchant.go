package model

import "time"

// ── Merchant (Agent / Vendor) Mode ───────────────────────────────────────────
//
// Lets authorised PowerSmart users become electricity vendors who sell tokens to
// walk-in customers. A merchant keeps a KSh float (topped up via M-Pesa /
// Airtel / bank); each sale issues a token straight onto the customer's meter
// and deducts the float. Every top-up and sale is recorded in a ledger.

// MerchantProfile is a user's vendor registration.
type MerchantProfile struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	UserName     string    `json:"user_name,omitempty"`
	BusinessName string    `json:"business_name"`
	Status       string    `json:"status"` // "pending" | "active" | "suspended"
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// MerchantLedger records money movements on a merchant's float.
type MerchantLedger struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	Type            string    `json:"type"` // "topup" | "sale"
	AmountKsh       int       `json:"amount_ksh"`
	Reference       string    `json:"reference"`
	CustomerAccount string    `json:"customer_account"`
	CreatedAt       time.Time `json:"created_at"`
}

// MerchantStatus is the merchant's live state for /api/merchant/me.
type MerchantStatus struct {
	Profile        *MerchantProfile  `json:"profile"` // null when the user is not a merchant
	FloatKsh       int               `json:"float_ksh"`
	TotalTopupsKsh int               `json:"total_topups_ksh"`
	TotalSalesKsh  int               `json:"total_sales_ksh"`
	SalesCount     int               `json:"sales_count"`
	RecentSales    []*MerchantLedger `json:"recent_sales"`
}

// ApplyMerchantRequest registers a vendor business.
type ApplyMerchantRequest struct {
	BusinessName string `json:"business_name"`
}

// FloatTopupRequest tops the merchant float up.
type FloatTopupRequest struct {
	AmountKsh int    `json:"amount_ksh"`
	Channel   string `json:"channel"` // mpesa | airtel | bank
}

// VendRequest sells a token to a customer's meter account.
type VendRequest struct {
	MeterAccount string `json:"meter_account"`
	AmountKsh    int    `json:"amount_ksh"`
}

// VendResult returns the issued token and the merchant's remaining float.
type VendResult struct {
	Token        *Token `json:"token"`
	BalanceKsh   int    `json:"balance_ksh"`
	CustomerName string `json:"customer_name"`
}

// SetMerchantStatusRequest is used by admins to approve/suspend a merchant.
type SetMerchantStatusRequest struct {
	Status string `json:"status"`
}
