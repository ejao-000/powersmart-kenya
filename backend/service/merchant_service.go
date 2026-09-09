package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// MerchantService powers vendor mode: float management and token vending to
// customer meter accounts, with an admin approval/suspension workflow.
type MerchantService struct {
	merchantRepo *repositories.MerchantRepo
	userRepo     *repositories.UserRepo
	meterRepo    *repositories.MeterRepo
	tokenSvc     *TokenService
}

func NewMerchantService(
	merchantRepo *repositories.MerchantRepo,
	userRepo *repositories.UserRepo,
	meterRepo *repositories.MeterRepo,
	tokenSvc *TokenService,
) *MerchantService {
	return &MerchantService{
		merchantRepo: merchantRepo,
		userRepo:     userRepo,
		meterRepo:    meterRepo,
		tokenSvc:     tokenSvc,
	}
}

// Apply registers the caller as a merchant (auto-active for the demo flow;
// admins can suspend later). Re-applying is idempotent — it returns the profile.
func (s *MerchantService) Apply(userID string, req *model.ApplyMerchantRequest) (*model.MerchantProfile, error) {
	name := strings.TrimSpace(req.BusinessName)
	if len(name) < 2 || len(name) > 80 {
		return nil, fmt.Errorf("%w: business name must be between 2 and 80 characters", ErrInvalid)
	}

	existing, err := s.merchantRepo.GetByUser(userID)
	if err == nil && existing != nil {
		return existing, nil
	}

	profile := &model.MerchantProfile{
		ID:           uuid.NewString(),
		UserID:       userID,
		BusinessName: name,
		Status:       "active",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.merchantRepo.CreateProfile(profile); err != nil {
		return nil, err
	}
	if u, err := s.userRepo.GetByID(userID); err == nil {
		profile.UserName = u.Name
	}
	return profile, nil
}

// Status returns the merchant profile (if any) plus float and sales summary.
func (s *MerchantService) Status(userID string) (*model.MerchantStatus, error) {
	out := &model.MerchantStatus{RecentSales: []*model.MerchantLedger{}}

	profile, err := s.merchantRepo.GetByUser(userID)
	if err == nil {
		out.Profile = profile
	} else if !errors.Is(err, repositories.ErrNotFound) {
		return nil, err
	}

	if out.Profile == nil {
		return out, nil
	}

	balance, err := s.merchantRepo.FloatBalance(userID)
	if err != nil {
		return nil, err
	}
	salesCount, salesKsh, topupsKsh, err := s.merchantRepo.SalesSummary(userID)
	if err != nil {
		return nil, err
	}
	sales, err := s.merchantRepo.RecentSales(userID, 10)
	if err != nil {
		return nil, err
	}

	out.FloatKsh = balance
	out.TotalTopupsKsh = topupsKsh
	out.TotalSalesKsh = salesKsh
	out.SalesCount = salesCount
	out.RecentSales = sales
	return out, nil
}

// TopUpFloat credits the merchant float (demo: instant confirmation).
func (s *MerchantService) TopUpFloat(userID string, req *model.FloatTopupRequest) (*model.MerchantStatus, error) {
	if err := s.requireActive(userID); err != nil {
		return nil, err
	}
	if req.AmountKsh < 100 || req.AmountKsh > 500_000 {
		return nil, fmt.Errorf("%w: top-up must be between KSh 100 and KSh 500,000", ErrInvalid)
	}
	channel := strings.ToLower(strings.TrimSpace(req.Channel))
	switch channel {
	case "mpesa", "airtel", "bank":
	default:
		return nil, fmt.Errorf("%w: channel must be mpesa, airtel or bank", ErrInvalid)
	}

	entry := &model.MerchantLedger{
		ID:        uuid.NewString(),
		UserID:    userID,
		Type:      "topup",
		AmountKsh: req.AmountKsh,
		Reference: fmt.Sprintf("TOP-%s-%d", uuid.NewString()[:8], time.Now().UnixMilli()),
	}
	if err := s.merchantRepo.AddLedger(entry); err != nil {
		return nil, err
	}
	return s.Status(userID)
}

// Vend sells a token to a customer's meter account using the merchant float.
func (s *MerchantService) Vend(userID string, req *model.VendRequest) (*model.VendResult, error) {
	if err := s.requireActive(userID); err != nil {
		return nil, err
	}
	if req.AmountKsh < 50 || req.AmountKsh > 200_000 {
		return nil, fmt.Errorf("%w: sale amount must be between KSh 50 and KSh 200,000", ErrInvalid)
	}

	balance, err := s.merchantRepo.FloatBalance(userID)
	if err != nil {
		return nil, err
	}
	if balance < req.AmountKsh {
		return nil, fmt.Errorf("%w: insufficient float — top up your merchant balance first", ErrInvalid)
	}

	// Resolve the customer by their Kenya Power meter account.
	customer, err := s.userRepo.GetByMeterAccount(strings.TrimSpace(req.MeterAccount))
	if err != nil {
		return nil, fmt.Errorf("%w: no PowerSmart customer found for that meter account", ErrInvalid)
	}
	if customer.ID == userID {
		return nil, fmt.Errorf("%w: you cannot vend to your own meter", ErrInvalid)
	}
	customerMeter, err := s.meterRepo.GetByUserID(customer.ID)
	if err != nil {
		return nil, fmt.Errorf("%w: customer meter not found", ErrInvalid)
	}

	// Issue a token directly onto the customer's meter.
	ref := fmt.Sprintf("VEND-%s-%d", uuid.NewString()[:8], time.Now().UnixMilli())
	token, err := s.tokenSvc.BuyTokenForPool(customer.ID, customerMeter.ID, req.AmountKsh, ref)
	if err != nil {
		return nil, err
	}

	// Record the sale against the merchant's float.
	sale := &model.MerchantLedger{
		ID:              uuid.NewString(),
		UserID:          userID,
		Type:            "sale",
		AmountKsh:       req.AmountKsh,
		Reference:       ref,
		CustomerAccount: strings.TrimSpace(req.MeterAccount),
	}
	if err := s.merchantRepo.AddLedger(sale); err != nil {
		return nil, err
	}

	return &model.VendResult{
		Token:        token,
		BalanceKsh:   balance - req.AmountKsh,
		CustomerName: customer.Name,
	}, nil
}

// ListMerchants returns every merchant (admin console).
func (s *MerchantService) ListMerchants() ([]*model.MerchantProfile, error) {
	list, err := s.merchantRepo.ListProfiles()
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []*model.MerchantProfile{}
	}
	return list, nil
}

// SetMerchantStatus approves or suspends a merchant (admin console).
func (s *MerchantService) SetMerchantStatus(profileID, status string) (*model.MerchantProfile, error) {
	switch status {
	case "active", "suspended", "pending":
	default:
		return nil, fmt.Errorf("%w: status must be active, suspended or pending", ErrInvalid)
	}
	profile, err := s.merchantRepo.GetByID(profileID)
	if err != nil {
		return nil, err
	}
	if err := s.merchantRepo.SetStatus(profileID, status); err != nil {
		return nil, err
	}
	profile.Status = status
	return profile, nil
}

func (s *MerchantService) requireActive(userID string) error {
	profile, err := s.merchantRepo.GetByUser(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return fmt.Errorf("%w: register as a vendor first", ErrInvalid)
		}
		return err
	}
	if profile.Status != "active" {
		return fmt.Errorf("%w: your vendor account is %s — contact an administrator", ErrForbidden, profile.Status)
	}
	return nil
}
