package service

import (
	"errors"
	"fmt"
	"log"
	"time"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// BluetoothService handles the server-side record-keeping for BLE token pushes.
// The actual BLE GATT write happens in the frontend via the Web Bluetooth API.
// This service records the outcome and flags tokens as needing a push.
type BluetoothService struct {
	tokenRepo *repositories.TokenRepo
}

func NewBluetoothService(tokenRepo *repositories.TokenRepo) *BluetoothService {
	return &BluetoothService{tokenRepo: tokenRepo}
}

// MarkPushRequested is called when the user initiates a Bluetooth push from the frontend.
// The frontend will attempt the BLE write and then call ConfirmPush or ReportPushFailed.
func (s *BluetoothService) MarkPushRequested(tokenID, userID string) (*model.Token, error) {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return nil, err
	}
	if token.UserID != userID {
		return nil, errors.New("access denied")
	}
	if token.PushStatus == model.PushSuccess {
		return nil, fmt.Errorf("token already successfully pushed at %v", token.PushedAt)
	}
	if err := s.tokenRepo.UpdatePushStatus(tokenID, model.PushPending, nil); err != nil {
		return nil, err
	}
	token.PushStatus = model.PushPending
	return token, nil
}

// ConfirmPush is called by the frontend after a successful BLE GATT write.
func (s *BluetoothService) ConfirmPush(tokenID, userID string) error {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return err
	}
	if token.UserID != userID {
		return errors.New("access denied")
	}
	now := time.Now()
	log.Printf("Token %s pushed to meter via Bluetooth at %v", tokenID, now)
	return s.tokenRepo.UpdatePushStatus(tokenID, model.PushSuccess, now)
}

// ReportPushFailed is called when the frontend BLE write fails (meter out of range, etc.).
func (s *BluetoothService) ReportPushFailed(tokenID, userID string) error {
	token, err := s.tokenRepo.GetByID(tokenID)
	if err != nil {
		return err
	}
	if token.UserID != userID {
		return errors.New("access denied")
	}
	return s.tokenRepo.UpdatePushStatus(tokenID, model.PushFailed, nil)
}
