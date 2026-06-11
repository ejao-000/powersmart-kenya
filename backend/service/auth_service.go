package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/utils"
)

var (
	ErrInvalidMeterAccount = errors.New("meter account not found in Kenya Power system")
	ErrAccountTaken        = errors.New("this meter account is already registered")
	ErrInvalidCredentials  = errors.New("invalid email or password")
)

type AuthService struct {
	userRepo    *repositories.UserRepo
	meterRepo   *repositories.MeterRepo
	kpValidator *utils.KPValidator
}

func NewAuthService(userRepo *repositories.UserRepo, meterRepo *repositories.MeterRepo, kpv *utils.KPValidator) *AuthService {
	return &AuthService{userRepo: userRepo, meterRepo: meterRepo, kpValidator: kpv}
}

// Register validates the Kenya Power meter account, then creates the user + meter record.
func (s *AuthService) Register(req *model.RegisterRequest) (*model.AuthResponse, error) {
	// 1. Validate meter account with Kenya Power
	meterNumber, err := s.kpValidator.ValidateAndGetMeterNumber(req.MeterAccount)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidMeterAccount, err)
	}

	// 2. Check meter account not already taken
	if _, err := s.userRepo.GetByMeterAccount(req.MeterAccount); err == nil {
		return nil, ErrAccountTaken
	}

	// 3. Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 4. Create user
	user := &model.User{
		ID:           uuid.NewString(),
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		Password:     string(hash),
		MeterAccount: req.MeterAccount,
		MeterNumber:  meterNumber,
		CreatedAt:    time.Now(),
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// 5. Create associated meter record
	meter := &model.Meter{
		ID:             uuid.NewString(),
		UserID:         user.ID,
		UnitsRemaining: 0,
		DailyAvgUnits:  0,
		AutoTopup:      false,
		TopupThreshold: 5,
		TopupAmountKsh: 200,
		UpdatedAt:      time.Now(),
	}
	if err := s.meterRepo.Create(meter); err != nil {
		return nil, err
	}

	// 6. Issue JWT
	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{Token: token, User: *user}, nil
}

// Login verifies credentials and returns a JWT.
func (s *AuthService) Login(req *model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{Token: token, User: *user}, nil
}
