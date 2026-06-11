package service

import (
	"math"
	"time"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

type PredictionService struct {
	meterRepo *repositories.MeterRepo
}

func NewPredictionService(meterRepo *repositories.MeterRepo) *PredictionService {
	return &PredictionService{meterRepo: meterRepo}
}

// Predict calculates how long the current units will last based on usage history.
func (s *PredictionService) Predict(meter *model.Meter) (*model.Prediction, error) {
	// Pull last 14 readings for slope calculation
	history, err := s.meterRepo.GetRecentHistory(meter.ID, 14)
	if err != nil {
		return nil, err
	}

	dailyAvg := meter.DailyAvgUnits
	confidence := "low"

	if len(history) >= 4 {
		dailyAvg = s.calculateDailyAvg(history)
		confidence = "medium"
	}
	if len(history) >= 10 {
		confidence = "high"
	}

	pred := &model.Prediction{
		UnitsRemaining:  meter.UnitsRemaining,
		DailyAvgUnits:   dailyAvg,
		ConfidenceLevel: confidence,
	}

	if dailyAvg > 0 {
		daysLeft := meter.UnitsRemaining / dailyAvg
		pred.DaysRemaining = math.Round(daysLeft*10) / 10

		depletion := time.Now().Add(time.Duration(daysLeft*24) * time.Hour)
		pred.DepletionDate = &depletion

		// Alert level
		switch {
		case daysLeft <= 1:
			pred.AlertLevel = "critical"
		case daysLeft <= 3:
			pred.AlertLevel = "warning"
		default:
			pred.AlertLevel = "ok"
		}

		// Recommend top-up amount to last 30 days (rough: Ksh 10 per kWh average)
		if daysLeft < 7 {
			needed := (30-daysLeft)*dailyAvg*10
			pred.RecommendedTopup = roundUp(needed, 50)
		}
	} else {
		pred.AlertLevel = "ok"
	}

	return pred, nil
}

// UpdateDailyAverage recalculates and persists the rolling daily average after a new reading.
func (s *PredictionService) UpdateDailyAverage(meter *model.Meter) error {
	history, err := s.meterRepo.GetRecentHistory(meter.ID, 14)
	if err != nil {
		return err
	}
	if len(history) < 2 {
		return nil
	}
	avg := s.calculateDailyAvg(history)
	return s.meterRepo.UpdateDailyAvg(meter.ID, avg)
}

// calculateDailyAvg computes average units consumed per day from sampled readings.
func (s *PredictionService) calculateDailyAvg(history []*model.UsageHistory) float64 {
	if len(history) < 2 {
		return 0
	}
	newest := history[0]
	oldest := history[len(history)-1]

	unitsConsumed := oldest.UnitsRemaining - newest.UnitsRemaining
	if unitsConsumed <= 0 {
		return 0
	}
	days := newest.RecordedAt.Sub(oldest.RecordedAt).Hours() / 24
	if days < 0.1 {
		return 0
	}
	return unitsConsumed / days
}

func roundUp(v float64, multiple float64) int {
	return int(math.Ceil(v/multiple) * multiple)
}
