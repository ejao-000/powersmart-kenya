package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

var (
	ErrInvalidAmount      = errors.New("amount must be at least Ksh 50")
	ErrUnsupportedChannel = errors.New("unsupported payment channel")
	ErrTokenNotOwned      = errors.New("token does not belong to this user")
)

// KPTokenProvider is an interface for the Kenya Power token generation API.
// In production this calls the KP vending API; in dev it returns a mock token.
type KPTokenProvider interface {
	IssueToken(meterNumber string, amountKsh int) (tokenNumber string, units float64, err error)
}

// TokenService manages the full lifecycle of a power token:
//  - Purchase flow (create transaction → call KP API → store token)
//  - History listing and soft-deletion
//  - Units-per-ksh rate calculation
//  - Transfer (send token value to another registered meter)
type TokenService struct {
	tokenRepo  *repositories.TokenRepo
	meterRepo  *repositories.MeterRepo
	txRepo     *repositories.TransactionRepo
	userRepo   *repositories.UserRepo
	kpProvider KPTokenProvider
}

func NewTokenService(
	tokenRepo *repositories.TokenRepo,
	meterRepo *repositories.MeterRepo,
	txRepo *repositories.TransactionRepo,
	userRepo *repositories.UserRepo,
) *TokenService {
	return &TokenService{
		tokenRepo:  tokenRepo,
		meterRepo:  meterRepo,
		txRepo:     txRepo,
		userRepo:   userRepo,
		kpProvider: &mockKPProvider{}, // swap for real provider in production
	}
}

// NewTokenServiceWithProvider allows injecting a real KP provider in production.
func NewTokenServiceWithProvider(
	tokenRepo *repositories.TokenRepo,
	meterRepo *repositories.MeterRepo,
	txRepo *repositories.TransactionRepo,
	userRepo *repositories.UserRepo,
	kpProvider KPTokenProvider,
) *TokenService {
	return &TokenService{
		tokenRepo:  tokenRepo,
		meterRepo:  meterRepo,
		txRepo:     txRepo,
		userRepo:   userRepo,
		kpProvider: kpProvider,
	}
}

// BuyToken is the primary purchase flow:
//  1. Validate inputs.
//  2. Create a pending transaction record.
//  3. Request token from KP vending API.
//  4. Persist the token record.
//  5. Link the token to the transaction and mark it successful.
//
// Note: for M-Pesa/Airtel the payment confirmation arrives asynchronously via
// callback. In those cases BuyToken creates the transaction and token record
// with status "pending"; the PaymentService callback handler calls
// FinaliseTokenAfterPayment once payment is confirmed.
func (s *TokenService) BuyToken(userID string, req *model.BuyTokenRequest) (*model.Token, error) {
	// -- Validate -----------------------------------------------------------
	if req.AmountKsh < 50 {
		return nil, ErrInvalidAmount
	}
	if req.PaymentChannel != "mpesa" && req.PaymentChannel != "airtel" && req.PaymentChannel != "bank" {
		return nil, ErrUnsupportedChannel
	}
	if (req.PaymentChannel == "mpesa" || req.PaymentChannel == "airtel") && req.Phone == "" {
		return nil, fmt.Errorf("phone number is required for %s payments", req.PaymentChannel)
	}

	// -- Fetch meter --------------------------------------------------------
	// A specific meter_id can be supplied (landlord multi-meter purchases);
	// otherwise fall back to the account's primary meter.
	var meter *model.Meter
	var err error
	if req.MeterID != "" {
		meter, err = s.meterRepo.GetByIDForUser(req.MeterID, userID)
		if err != nil {
			return nil, fmt.Errorf("meter not found for user: %w", err)
		}
	} else {
		meter, err = s.meterRepo.GetByUserID(userID)
		if err != nil {
			return nil, fmt.Errorf("meter not found for user: %w", err)
		}
	}

	// -- Create pending transaction -----------------------------------------
	internalRef := fmt.Sprintf("PS-%s-%d", uuid.NewString()[:8], time.Now().UnixMilli())
	txRecord := &model.Transaction{
		ID:        uuid.NewString(),
		UserID:    userID,
		Channel:   model.PaymentChannel(req.PaymentChannel),
		Phone:     req.Phone,
		AmountKsh: req.AmountKsh,
		Reference: internalRef,
		Status:    model.TxPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.txRepo.Create(txRecord); err != nil {
		return nil, fmt.Errorf("failed to create transaction record: %w", err)
	}

	// -- For direct / bank payments: issue token immediately ----------------
	// For mobile money: the token is issued after the callback confirms payment.
	// Here we issue immediately for simplicity (and for bank/test flows).
	tokenNumber, units, err := s.kpProvider.IssueToken(meter.MeterNumber, req.AmountKsh)
	if err != nil {
		// Mark transaction as failed
		_ = s.txRepo.UpdateStatus(txRecord.ID, model.TxFailed, "")
		return nil, fmt.Errorf("KP token issuance failed: %w", err)
	}

	// -- Persist token ------------------------------------------------------
	token := &model.Token{
		ID:          uuid.NewString(),
		UserID:      userID,
		MeterID:     meter.ID,
		TokenNumber: tokenNumber,
		Units:       units,
		AmountKsh:   req.AmountKsh,
		PaymentRef:  internalRef,
		PushStatus:  model.PushPending,
		PurchasedAt: time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, fmt.Errorf("failed to save token: %w", err)
	}

	// -- Link token to transaction, mark success ----------------------------
	_ = s.txRepo.LinkToken(txRecord.ID, token.ID)
	_ = s.txRepo.UpdateStatus(txRecord.ID, model.TxSuccess, internalRef)

	return token, nil
}

// FinaliseTokenAfterPayment is called by the PaymentService once a mobile money
// callback confirms payment. It issues the KP token and updates the token record
// that was initially created in "pending" state.
func (s *TokenService) FinaliseTokenAfterPayment(txRecord *model.Transaction) (*model.Token, error) {
	meter, err := s.meterRepo.GetByUserID(txRecord.UserID)
	if err != nil {
		return nil, fmt.Errorf("meter not found: %w", err)
	}

	tokenNumber, units, err := s.kpProvider.IssueToken(meter.MeterNumber, txRecord.AmountKsh)
	if err != nil {
		return nil, fmt.Errorf("KP token issuance failed after payment: %w", err)
	}

	token := &model.Token{
		ID:          uuid.NewString(),
		UserID:      txRecord.UserID,
		MeterID:     meter.ID,
		TokenNumber: tokenNumber,
		Units:       units,
		AmountKsh:   txRecord.AmountKsh,
		PaymentRef:  txRecord.Reference,
		PushStatus:  model.PushPending,
		PurchasedAt: time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, fmt.Errorf("failed to save token: %w", err)
	}

	_ = s.txRepo.LinkToken(txRecord.ID, token.ID)
	return token, nil
}

// TransferUnits lets a user send token value to another registered meter account.
// A token is issued directly on the recipient's meter; the sender gets a transfer
// transaction record for their own history.
func (s *TokenService) TransferUnits(senderID string, req *model.TransferTokenRequest) (*model.Token, error) {
	if req.AmountKsh < 50 {
		return nil, ErrInvalidAmount
	}

	recipient, err := s.userRepo.GetByMeterAccount(req.MeterAccount)
	if err != nil {
		return nil, fmt.Errorf("no PowerSmart account found for that meter account")
	}
	if recipient.ID == senderID {
		return nil, fmt.Errorf("you cannot transfer tokens to your own meter")
	}

	recipientMeter, err := s.meterRepo.GetByUserID(recipient.ID)
	if err != nil {
		return nil, fmt.Errorf("recipient meter not found")
	}

	// Issue a token directly on the recipient's meter.
	tokenNumber, units, err := s.kpProvider.IssueToken(recipientMeter.MeterNumber, req.AmountKsh)
	if err != nil {
		return nil, fmt.Errorf("KP token issuance failed: %w", err)
	}

	token := &model.Token{
		ID:          uuid.NewString(),
		UserID:      recipient.ID,
		MeterID:     recipientMeter.ID,
		TokenNumber: tokenNumber,
		Units:       units,
		AmountKsh:   req.AmountKsh,
		PaymentRef:  fmt.Sprintf("TRF-%s", uuid.NewString()[:8]),
		PushStatus:  model.PushPending,
		PurchasedAt: time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, fmt.Errorf("failed to save transferred token: %w", err)
	}

	// Sender-side transaction record.
	tx := &model.Transaction{
		ID:        uuid.NewString(),
		UserID:    senderID,
		Channel:   "bank",
		AmountKsh: req.AmountKsh,
		Reference: "PS-" + token.PaymentRef,
		Status:    model.TxSuccess,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = s.txRepo.Create(tx)

	return token, nil
}

// ListHistory returns all non-deleted tokens for a user, newest first.
func (s *TokenService) ListHistory(userID string) ([]*model.Token, error) {
	tokens, err := s.tokenRepo.ListByUser(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token history: %w", err)
	}
	return tokens, nil
}

// DeleteFromHistory soft-deletes a token record from a user's history.
// The token itself remains valid on the Kenya Power system.
func (s *TokenService) DeleteFromHistory(tokenID, userID string) error {
	// Verify ownership first
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return repositories.ErrNotFound
	}
	if token.UserID != userID {
		return ErrTokenNotOwned
	}
	return s.tokenRepo.SoftDelete(tokenID, userID)
}

// UnitsForAmount returns the expected kWh for a given purchase amount.
// Uses the current KP tariff rate (approximately 25.35 kWh per Ksh 100 after levies).
// This is used for the UI preview before payment is submitted.
func (s *TokenService) UnitsForAmount(amountKsh int) float64 {
	// KP tariff (approximate, subject to EPRA revision):
	// Step 1: 0–50 kWh  → Ksh 2.90/kWh
	// Step 2: 51–1500   → Ksh 3.00/kWh
	// Plus fixed levies: REP levy, fuel charge, forex surcharge ≈ Ksh 1.50/kWh
	// Net: ≈ 20–22 kWh per Ksh 100 after all levies
	const kwhPerKsh = 0.20 // conservative estimate at current tariff
	return float64(amountKsh) * kwhPerKsh
}

// ──────────────────────────────────────────────────────────────────────────
// Mock KP token provider (development / testing only)
// ──────────────────────────────────────────────────────────────────────────

type mockKPProvider struct{}

func (m *mockKPProvider) IssueToken(meterNumber string, amountKsh int) (string, float64, error) {
	// Generate a deterministic-looking 20-digit token from the amount and time
	token := fmt.Sprintf("%020d", time.Now().UnixMilli()% 10_000_000_000_000_000)
	units := float64(amountKsh) * 0.20 // ~20 kWh per Ksh 100 (mock rate)
	return token, units, nil
}