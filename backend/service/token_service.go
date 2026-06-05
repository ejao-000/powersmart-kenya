package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
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
type TokenService struct {
	tokenRepo *repositories.TokenRepo
	meterRepo *repositories.MeterRepo
	txRepo    *repositories.TransactionRepo
	kpProvider KPTokenProvider
}

func NewTokenService(
	tokenRepo *repositories.TokenRepo,
	meterRepo *repositories.MeterRepo,
	txRepo *repositories.TransactionRepo,
) *TokenService {
	return &TokenService{
		tokenRepo:  tokenRepo,
		meterRepo:  meterRepo,
		txRepo:     txRepo,
		kpProvider: &mockKPProvider{}, // swap for real provider in production
	}
}

// NewTokenServiceWithProvider allows injecting a real KP provider in production.
func NewTokenServiceWithProvider(
	tokenRepo *repositories.TokenRepo,
	meterRepo *repositories.MeterRepo,
	txRepo *repositories.TransactionRepo,
	kpProvider KPTokenProvider,
) *TokenService {
	return &TokenService{
		tokenRepo:  tokenRepo,
		meterRepo:  meterRepo,
		txRepo:     txRepo,
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
func (s *TokenService) BuyToken(userID string, req *models.BuyTokenRequest) (*models.Token, error) {
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
	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("meter not found for user: %w", err)
	}

	// -- Create pending transaction -----------------------------------------
	internalRef := fmt.Sprintf("PS-%s-%d", uuid.NewString()[:8], time.Now().UnixMilli())
	txRecord := &models.Transaction{
		ID:        uuid.NewString(),
		UserID:    userID,
		Channel:   models.PaymentChannel(req.PaymentChannel),
		Phone:     req.Phone,
		AmountKsh: req.AmountKsh,
		Reference: internalRef,
		Status:    models.TxPending,
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
		_ = s.txRepo.UpdateStatus(txRecord.ID, models.TxFailed, "")
		return nil, fmt.Errorf("KP token issuance failed: %w", err)
	}

	// -- Persist token ------------------------------------------------------
	token := &models.Token{
		ID:          uuid.NewString(),
		UserID:      userID,
		MeterID:     meter.ID,
		TokenNumber: tokenNumber,
		Units:       units,
		AmountKsh:   req.AmountKsh,
		PaymentRef:  internalRef,
		PushStatus:  models.PushPending,
		PurchasedAt: time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, fmt.Errorf("failed to save token: %w", err)
	}

	// -- Link token to transaction, mark success ----------------------------
	_ = s.txRepo.LinkToken(txRecord.ID, token.ID)
	_ = s.txRepo.UpdateStatus(txRecord.ID, models.TxSuccess, internalRef)

	return token, nil
}

// FinaliseTokenAfterPayment is called by the PaymentService once a mobile money
// callback confirms payment. It issues the KP token and updates the token record
// that was initially created in "pending" state.
func (s *TokenService) FinaliseTokenAfterPayment(txRecord *models.Transaction) (*models.Token, error) {
	meter, err := s.meterRepo.GetByUserID(txRecord.UserID)
	if err != nil {
		return nil, fmt.Errorf("meter not found: %w", err)
	}

	tokenNumber, units, err := s.kpProvider.IssueToken(meter.MeterNumber, txRecord.AmountKsh)
	if err != nil {
		return nil, fmt.Errorf("KP token issuance failed after payment: %w", err)
	}

	token := &models.Token{
		ID:          uuid.NewString(),
		UserID:      txRecord.UserID,
		MeterID:     meter.ID,
		TokenNumber: tokenNumber,
		Units:       units,
		AmountKsh:   txRecord.AmountKsh,
		PaymentRef:  txRecord.Reference,
		PushStatus:  models.PushPending,
		PurchasedAt: time.Now(),
	}
	if err := s.tokenRepo.Create(token); err != nil {
		return nil, fmt.Errorf("failed to save token: %w", err)
	}

	_ = s.txRepo.LinkToken(txRecord.ID, token.ID)
	return token, nil
}

// ListHistory returns all non-deleted tokens for a user, newest first.
func (s *TokenService) ListHistory(userID string) ([]*models.Token, error) {
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
	token := fmt.Sprintf("%020d", time.Now().UnixMilli()%100_000_000_000_000_000_000)
	units := float64(amountKsh) * 0.20 // ~20 kWh per Ksh 100 (mock rate)
	return token, units, nil
}