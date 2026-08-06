package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

type MeterRepo struct {
	db *sql.DB
}

func NewMeterRepo(db *sql.DB) *MeterRepo {
	return &MeterRepo{db: db}
}

func (r *MeterRepo) Create(m *model.Meter) error {
	_, err := r.db.Exec(`
		INSERT INTO meters (id, user_id, meter_number, units_remaining, daily_avg_units, auto_topup, topup_threshold, topup_amount, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		m.ID, m.UserID, m.MeterNumber, m.UnitsRemaining, m.DailyAvgUnits,
		m.AutoTopup, m.TopupThreshold, m.TopupAmountKsh, m.UpdatedAt,
	)
	return err
}

func (r *MeterRepo) GetByUserID(userID string) (*model.Meter, error) {
	m := &model.Meter{}
	err := r.db.QueryRow(`
		SELECT id, user_id, meter_number, units_remaining, daily_avg_units, last_reading_at,
		       auto_topup, topup_threshold, topup_amount, updated_at
		FROM meters WHERE user_id = ?`, userID).
		Scan(&m.ID, &m.UserID, &m.MeterNumber, &m.UnitsRemaining, &m.DailyAvgUnits, &m.LastReadingAt,
			&m.AutoTopup, &m.TopupThreshold, &m.TopupAmountKsh, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

func (r *MeterRepo) UpdateReading(meterID string, units float64) error {
	_, err := r.db.Exec(`
		UPDATE meters SET units_remaining = ?, last_reading_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`, units, meterID)
	return err
}

func (r *MeterRepo) UpdateDailyAvg(meterID string, avgUnits float64) error {
	_, err := r.db.Exec(
		`UPDATE meters SET daily_avg_units = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		avgUnits, meterID)
	return err
}

func (r *MeterRepo) UpdateSettings(meterID string, s *model.MeterSettings) error {
	_, err := r.db.Exec(`
		UPDATE meters SET auto_topup = ?, topup_threshold = ?, topup_amount = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`, s.AutoTopup, s.TopupThreshold, s.TopupAmountKsh, meterID)
	return err
}

// InsertUsageHistory saves a point-in-time reading for trend analysis.
func (r *MeterRepo) InsertUsageHistory(h *model.UsageHistory) error {
	_, err := r.db.Exec(
		`INSERT INTO usage_history (id, meter_id, units_remaining, recorded_at) VALUES (?, ?, ?, ?)`,
		h.ID, h.MeterID, h.UnitsRemaining, h.RecordedAt)
	return err
}

// GetRecentHistory fetches the last N readings for prediction calculations.
func (r *MeterRepo) GetRecentHistory(meterID string, limit int) ([]*model.UsageHistory, error) {
	rows, err := r.db.Query(`
		SELECT id, meter_id, units_remaining, recorded_at
		FROM usage_history WHERE meter_id = ?
		ORDER BY recorded_at DESC LIMIT ?`, meterID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hist []*model.UsageHistory
	for rows.Next() {
		h := &model.UsageHistory{}
		if err := rows.Scan(&h.ID, &h.MeterID, &h.UnitsRemaining, &h.RecordedAt); err != nil {
			return nil, err
		}
		hist = append(hist, h)
	}
	return hist, rows.Err()
}
