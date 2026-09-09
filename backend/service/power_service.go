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

// PowerService powers the emergency features:
//
//   - Power reserve: set aside kWh on your meter that are kept for emergencies
//     (available = balance − reserve). Releasing the reserve unlocks it again.
//   - "I need power": public help requests; other users fulfil them by sending
//     a token straight to the requester's meter.
type PowerService struct {
	powerRepo *repositories.PowerRepo
	meterRepo *repositories.MeterRepo
	userRepo  *repositories.UserRepo
	tokenSvc  *TokenService
}

func NewPowerService(
	powerRepo *repositories.PowerRepo,
	meterRepo *repositories.MeterRepo,
	userRepo *repositories.UserRepo,
	tokenSvc *TokenService,
) *PowerService {
	return &PowerService{powerRepo: powerRepo, meterRepo: meterRepo, userRepo: userRepo, tokenSvc: tokenSvc}
}

func (s *PowerService) primaryMeter(userID string) (*model.Meter, error) {
	m, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, fmt.Errorf("%w: no meter linked to this account", ErrInvalid)
		}
		return nil, err
	}
	return m, nil
}

func (s *PowerService) reserveView(meter *model.Meter) (*model.ReserveView, error) {
	reserved, err := s.powerRepo.GetReserve(meter.ID)
	if err != nil {
		return nil, err
	}
	available := meter.UnitsRemaining - reserved
	if available < 0 {
		available = 0
	}
	return &model.ReserveView{
		MeterID:        meter.ID,
		UnitsRemaining: meter.UnitsRemaining,
		ReservedKwh:    reserved,
		AvailableKwh:   available,
		UpdatedAt:      time.Now(),
	}, nil
}

// Reserve returns the current reserve state for the primary meter.
func (s *PowerService) Reserve(userID string) (*model.ReserveView, error) {
	meter, err := s.primaryMeter(userID)
	if err != nil {
		return nil, err
	}
	return s.reserveView(meter)
}

// SetReserve stores the kWh the user wants to keep for emergencies.
func (s *PowerService) SetReserve(userID string, kwh float64) (*model.ReserveView, error) {
	meter, err := s.primaryMeter(userID)
	if err != nil {
		return nil, err
	}
	if kwh < 0 || kwh > meter.UnitsRemaining {
		return nil, fmt.Errorf("%w: reserve must be between 0 and your balance of %s", ErrInvalid, trimFloat(meter.UnitsRemaining))
	}
	if err := s.powerRepo.SetReserve(meter.ID, kwh); err != nil {
		return nil, err
	}
	return s.reserveView(meter)
}

// ReleaseReserve unlocks the reserved power for everyday use.
func (s *PowerService) ReleaseReserve(userID string) (*model.ReserveView, error) {
	meter, err := s.primaryMeter(userID)
	if err != nil {
		return nil, err
	}
	if err := s.powerRepo.SetReserve(meter.ID, 0); err != nil {
		return nil, err
	}
	return s.reserveView(meter)
}

// ── Emergency power requests ─────────────────────────────────────────────────

func (s *PowerService) CreatePowerRequest(userID string, req *model.CreatePowerRequestRequest) (*model.PowerRequest, error) {
	if req.AmountKsh < 50 || req.AmountKsh > 5000 {
		return nil, fmt.Errorf("%w: request must be between KSh 50 and KSh 5,000", ErrInvalid)
	}
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}
	p := &model.PowerRequest{
		ID:           uuid.NewString(),
		UserID:       userID,
		MeterAccount: user.MeterAccount,
		AmountKsh:    req.AmountKsh,
		Note:         strings.TrimSpace(req.Note),
		Status:       "open",
		CreatedAt:    time.Now(),
	}
	if err := s.powerRepo.CreatePowerRequest(p); err != nil {
		return nil, err
	}
	p.RequesterName = user.Name
	return p, nil
}

// ListPowerRequests returns open requests (from others) and the caller's own.
func (s *PowerService) ListPowerRequests(userID string) (*model.PowerRequestBundle, error) {
	open, err := s.powerRepo.OpenPowerRequests()
	if err != nil {
		return nil, err
	}
	mine, err := s.powerRepo.PowerRequestsByUser(userID)
	if err != nil {
		return nil, err
	}
	if open == nil {
		open = []*model.PowerRequest{}
	}
	if mine == nil {
		mine = []*model.PowerRequest{}
	}
	return &model.PowerRequestBundle{Open: open, Mine: mine}, nil
}

// FulfilPowerRequest sends power to a requester and closes the request.
func (s *PowerService) FulfilPowerRequest(helperID, requestID string) (*model.PowerRequestFulfillment, error) {
	req, err := s.powerRepo.GetPowerRequest(requestID)
	if err != nil {
		return nil, err
	}
	if req.Status != "open" {
		return nil, fmt.Errorf("%w: this request is no longer open", ErrInvalid)
	}
	if req.UserID == helperID {
		return nil, fmt.Errorf("%w: you cannot fulfil your own request", ErrInvalid)
	}

	meter, err := s.meterRepo.GetByUserID(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("%w: requester meter not found", ErrInvalid)
	}
	token, err := s.tokenSvc.BuyTokenForPool(req.UserID, meter.ID, req.AmountKsh, "HELP-"+uuid.NewString()[:8])
	if err != nil {
		return nil, err
	}
	if err := s.powerRepo.MarkFulfilled(req.ID, helperID); err != nil {
		return nil, err
	}

	helper, _ := s.userRepo.GetByID(helperID)
	req.Status = "fulfilled"
	req.FulfilledBy = helperID
	req.HelperName = helper.Name
	now := time.Now()
	req.FulfilledAt = &now
	return &model.PowerRequestFulfillment{Request: req, Token: token}, nil
}

// CancelPowerRequest lets the owner cancel an open request.
func (s *PowerService) CancelPowerRequest(ownerID, requestID string) error {
	req, err := s.powerRepo.GetPowerRequest(requestID)
	if err != nil {
		return err
	}
	if req.UserID != ownerID {
		return fmt.Errorf("%w: you can only cancel your own requests", ErrForbidden)
	}
	if req.Status != "open" {
		return fmt.Errorf("%w: this request is no longer open", ErrInvalid)
	}
	return s.powerRepo.MarkCancelled(requestID)
}
