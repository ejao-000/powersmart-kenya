package model

import "time"

// ── Power Pools (shared electricity wallet) ──────────────────────────────────
//
// A Power Pool groups several PowerSmart users around a shared meter (housemates,
// families, hostels, small businesses). Members contribute KSh into the pool and
// authorised members buy tokens for the shared meter from the pooled balance.
// Every contribution and purchase is recorded in a ledger so the pool always
// knows its balance and each member's share.

// PoolRole defines what a member may do in a pool.
type PoolRole string

const (
	PoolRoleOwner  PoolRole = "owner"  // the member who created the pool
	PoolRoleAdmin  PoolRole = "admin"  // can manage the pool, members and purchases
	PoolRoleMember PoolRole = "member" // can contribute; may buy if can_buy
)

// PowerPool is a shared electricity wallet tied to a single meter.
type PowerPool struct {
	ID         string    `json:"id"`
	MeterID    string    `json:"meter_id"`
	Name       string    `json:"name"`
	InviteCode string    `json:"invite_code"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// PoolMember is a user's membership of a pool with their permissions.
type PoolMember struct {
	ID             string    `json:"id"`
	PoolID         string    `json:"pool_id"`
	UserID         string    `json:"user_id"`
	Role           PoolRole  `json:"role"`
	CanBuy         bool      `json:"can_buy"`
	CanInvite      bool      `json:"can_invite"`
	JoinedAt       time.Time `json:"joined_at"`
	Name           string    `json:"name,omitempty"`            // joined from users — display only
	ContributedKsh int       `json:"contributed_ksh,omitempty"` // lifetime contributions — computed
}

// PoolContribution records money added to a pool wallet.
type PoolContribution struct {
	ID        string    `json:"id"`
	PoolID    string    `json:"pool_id"`
	UserID    string    `json:"user_id"`
	UserName  string    `json:"user_name,omitempty"`
	AmountKsh int       `json:"amount_ksh"`
	Channel   string    `json:"channel"` // mpesa | airtel | bank | manual
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

// PoolExpense records money spent from a pool wallet (a token purchase).
type PoolExpense struct {
	ID          string    `json:"id"`
	PoolID      string    `json:"pool_id"`
	UserID      string    `json:"user_id"`
	UserName    string    `json:"user_name,omitempty"`
	TokenID     string    `json:"token_id,omitempty"`
	AmountKsh   int       `json:"amount_ksh"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	TokenNumber string    `json:"token_number,omitempty"` // joined from tokens — display only
	TokenUnits  float64   `json:"token_units,omitempty"`
}

// PoolTotals aggregates the wallet state for a pool.
type PoolTotals struct {
	ContributionsKsh int `json:"contributions_ksh"`
	SpentKsh         int `json:"spent_ksh"`
}

// PoolSummary is a lightweight view of a pool for list screens.
type PoolSummary struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	MeterID          string    `json:"meter_id"`
	MeterName        string    `json:"meter_name"`
	InviteCode       string    `json:"invite_code"`
	MyRole           PoolRole  `json:"my_role"`
	MyCanBuy         bool      `json:"my_can_buy"`
	MyCanInvite      bool      `json:"my_can_invite"`
	BalanceKsh       int       `json:"balance_ksh"`
	ContributionsKsh int       `json:"contributions_ksh"`
	SpentKsh         int       `json:"spent_ksh"`
	MemberCount      int       `json:"member_count"`
	CreatedAt        time.Time `json:"created_at"`
}

// PoolActivity is a merged ledger line (contribution or expense) for the feed.
type PoolActivity struct {
	Kind        string    `json:"kind"` // "contribution" | "expense"
	ID          string    `json:"id"`
	UserName    string    `json:"user_name"`
	AmountKsh   int       `json:"amount_ksh"`
	Channel     string    `json:"channel,omitempty"`
	Note        string    `json:"note,omitempty"`
	TokenNumber string    `json:"token_number,omitempty"`
	TokenUnits  float64   `json:"token_units,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// PoolDetail is the full payload for GET /api/pools/{id}.
type PoolDetail struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	MeterID          string          `json:"meter_id"`
	MeterName        string          `json:"meter_name"`
	InviteCode       string          `json:"invite_code"`
	MyRole           PoolRole        `json:"my_role"`
	MyCanBuy         bool            `json:"my_can_buy"`
	MyCanInvite      bool            `json:"my_can_invite"`
	BalanceKsh       int             `json:"balance_ksh"`
	ContributionsKsh int             `json:"contributions_ksh"`
	SpentKsh         int             `json:"spent_ksh"`
	Members          []*PoolMember   `json:"members"`
	Activity         []*PoolActivity `json:"activity"`
	CreatedAt        time.Time       `json:"created_at"`
}

// ── Request payloads ─────────────────────────────────────────────────────────

// CreatePoolRequest creates a pool for one of the caller's meters.
type CreatePoolRequest struct {
	MeterID string `json:"meter_id"`
	Name    string `json:"name"`
}

// JoinPoolRequest is used to join an existing pool via its invite code.
type JoinPoolRequest struct {
	InviteCode string `json:"invite_code"`
}

// AddPoolMemberRequest invites an existing user (by email) into a pool.
type AddPoolMemberRequest struct {
	Email     string `json:"email"`
	CanBuy    *bool  `json:"can_buy"`    // optional, default true
	CanInvite *bool  `json:"can_invite"` // optional, default false
}

// UpdatePoolMemberRequest adjusts a member's role / permissions.
type UpdatePoolMemberRequest struct {
	Role      *string `json:"role"` // "admin" | "member"
	CanBuy    *bool   `json:"can_buy"`
	CanInvite *bool   `json:"can_invite"`
}

// AddPoolContributionRequest tops the pool wallet up.
type AddPoolContributionRequest struct {
	AmountKsh int    `json:"amount_ksh"`
	Channel   string `json:"channel"` // mpesa | airtel | bank
	Note      string `json:"note"`
}

// PurchaseWithPoolRequest buys a token from the pool balance.
type PurchaseWithPoolRequest struct {
	AmountKsh int `json:"amount_ksh"`
}

// PoolPurchaseResult returns the new token and the updated wallet balance.
type PoolPurchaseResult struct {
	Expense    *PoolExpense `json:"expense"`
	Token      *Token       `json:"token"`
	BalanceKsh int          `json:"balance_ksh"`
}
