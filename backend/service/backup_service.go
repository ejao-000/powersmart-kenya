package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// BackupService manages a user's backup power sources.
type BackupService struct {
	backupRepo *repositories.BackupRepo
}

func NewBackupService(backupRepo *repositories.BackupRepo) *BackupService {
	return &BackupService{backupRepo: backupRepo}
}

var backupTypes = map[string]bool{
	"solar": true, "inverter": true, "battery": true, "generator": true, "power_station": true,
}

func (s *BackupService) List(userID string) ([]*model.BackupSource, error) {
	list, err := s.backupRepo.ListByUser(userID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []*model.BackupSource{}
	}
	return list, nil
}

func (s *BackupService) Upsert(userID string, req *model.UpsertBackupRequest) (*model.BackupSource, error) {
	kind := strings.ToLower(strings.TrimSpace(req.Type))
	if !backupTypes[kind] {
		return nil, fmt.Errorf("%w: type must be solar, inverter, battery, generator or power_station", ErrInvalid)
	}
	if req.CapacityKwh <= 0 || req.CapacityKwh > 1000 {
		return nil, fmt.Errorf("%w: capacity must be between 0.1 and 1000 kWh", ErrInvalid)
	}
	if req.ChargePct < 0 || req.ChargePct > 100 {
		return nil, fmt.Errorf("%w: charge must be between 0 and 100 percent", ErrInvalid)
	}

	src := &model.BackupSource{
		ID:          uuid.NewString(),
		UserID:      userID,
		Type:        kind,
		Name:        strings.TrimSpace(req.Name),
		CapacityKwh: req.CapacityKwh,
		ChargePct:   req.ChargePct,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.backupRepo.Upsert(src); err != nil {
		return nil, err
	}
	// Return the stored row (fresh id/created_at when inserted).
	return s.backupRepo.GetByUserAndType(userID, kind)
}

func (s *BackupService) Delete(userID, id string) error {
	return s.backupRepo.Delete(id, userID)
}
