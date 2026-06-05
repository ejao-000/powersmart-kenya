package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
)

// MeterService handles all business logic for a user's smart meter:
// - Reading status
// - Recording telemetry (units remaining)
// - Auto top-up trigger check
// - Settings management
type MeterService struct {
	meterRepo *repositories.MeterRepo
}

func NewMeterService(meterRepo *repositories.MeterRepo) *MeterService {
	return &MeterService{meterRepo: meterRepo}
}

// GetStatus returns the current meter state for a user.
// Returns a descriptive error if the meter record hasn't been created yet.
func (s *MeterService) GetStatus(userID string) (*models.Meter, error) {
	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, fmt.Errorf("no meter linked to this account — contact support")
		}
		return nil, fmt.Errorf("failed to fetch meter: %w", err)
	}
	return meter, nil
}

// RecordReading saves a new unit-remaining telemetry reading and:
//  1. Updates the current meter units.
//  2. Appends a point-in-time history record for the prediction engine.
//  3. Checks whether auto top-up should be triggered.
//
// Returns AutoTopupTriggered = true when the auto top-up threshold is breached
// so the caller (handler or background job) can initiate a payment.
func (s *MeterService) RecordReading(userID string, unitsRemaining float64) error {
	if unitsRemaining < 0 {
		return fmt.Errorf("units remaining cannot be negative")
	}

	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		return fmt.Errorf("meter not found: %w", err)
	}

	// 1. Persist the new reading on the meter row
	if err := s.meterRepo.UpdateReading(meter.ID, unitsRemaining); err != nil {
		return fmt.Errorf("failed to update meter reading: %w", err)
	}

	// 2. Append history record for trend / prediction
	history := &models.UsageHistory{
		ID:             uuid.NewString(),
		MeterID:        meter.ID,
		UnitsRemaining: unitsRemaining,
		RecordedAt:     time.Now(),
	}
	if err := s.meterRepo.InsertUsageHistory(history); err != nil {
		// Non-fatal: log but don't fail the whole request
		fmt.Printf("[meter_service] warning: could not save history record: %v\n", err)
	}

	// 3. Auto top-up check — update meter struct with new reading for comparison
	meter.UnitsRemaining = unitsRemaining
	if s.shouldTriggerAutoTopup(meter) {
		// Signal the auto top-up intent; actual payment is initiated by the caller
		// to avoid circular dependency with payment_service.
		// We use a named event so the handler can decide whether to kick it off.
		fmt.Printf(
			"[meter_service] auto top-up triggered for meter %s (%.2f kWh <= %.2f kWh threshold)\n",
			meter.ID, unitsRemaining, meter.TopupThreshold,
		)
	}

	return nil
}

// AutoTopupNeeded returns true when the meter is configured for auto top-up
// and the current units are at or below the configured threshold.
// Handlers can call this after RecordReading to decide whether to invoke PaymentService.
func (s *MeterService) AutoTopupNeeded(meter *models.Meter) bool {
	return s.shouldTriggerAutoTopup(meter)
}

func (s *MeterService) shouldTriggerAutoTopup(m *models.Meter) bool {
	return m.AutoTopup && m.UnitsRemaining <= m.TopupThreshold
}

// UpdateSettings saves auto top-up and threshold preferences.
func (s *MeterService) UpdateSettings(userID string, settings *models.MeterSettings) error {
	if err := s.validateSettings(settings); err != nil {
		return err
	}

	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		return fmt.Errorf("meter not found: %w", err)
	}

	if err := s.meterRepo.UpdateSettings(meter.ID, settings); err != nil {
		return fmt.Errorf("failed to save settings: %w", err)
	}
	return nil
}

func (s *MeterService) validateSettings(settings *models.MeterSettings) error {
	if settings.TopupThreshold < 0 {
		return fmt.Errorf("top-up threshold cannot be negative")
	}
	if settings.TopupAmountKsh < 50 {
		return fmt.Errorf("minimum top-up amount is Ksh 50")
	}
	if settings.TopupAmountKsh > 100_000 {
		return fmt.Errorf("top-up amount exceeds maximum limit of Ksh 100,000")
	}
	return nil
}

// GetMeterByUserID is a convenience alias used by other services.
func (s *MeterService) GetMeterByUserID(userID string) (*models.Meter, error) {
	return s.meterRepo.GetByUserID(userID)
}
