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
		INSERT INTO meters (id, user_id, name, meter_number, units_remaining, daily_avg_units, auto_topup, topup_threshold, topup_amount, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		m.ID, m.UserID, m.Name, m.MeterNumber, m.UnitsRemaining, m.DailyAvgUnits,
		m.AutoTopup, m.TopupThreshold, m.TopupAmountKsh, m.UpdatedAt,
	)
	return err
}

func (r *MeterRepo) GetByUserID(userID string) (*model.Meter, error) {
	m := &model.Meter{}
	err := r.db.QueryRow(`
		SELECT id, user_id, COALESCE(name,''), meter_number, units_remaining, daily_avg_units, last_reading_at,
		       auto_topup, topup_threshold, topup_amount, updated_at
		FROM meters WHERE user_id = $1`, userID).
		Scan(&m.ID, &m.UserID, &m.Name, &m.MeterNumber, &m.UnitsRemaining, &m.DailyAvgUnits, &m.LastReadingAt,
			&m.AutoTopup, &m.TopupThreshold, &m.TopupAmountKsh, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

// ListByOwner returns every meter managed by the given account (a tenant has
// one; a landlord can have many). Newest first.
func (r *MeterRepo) ListByOwner(userID string) ([]*model.Meter, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, COALESCE(name,''), meter_number, units_remaining, daily_avg_units, last_reading_at,
		       auto_topup, topup_threshold, topup_amount, updated_at
		FROM meters WHERE user_id = $1
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.Meter
	for rows.Next() {
		m := &model.Meter{}
		if err := rows.Scan(&m.ID, &m.UserID, &m.Name, &m.MeterNumber, &m.UnitsRemaining, &m.DailyAvgUnits, &m.LastReadingAt,
			&m.AutoTopup, &m.TopupThreshold, &m.TopupAmountKsh, &m.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

// GetByIDForUser returns a meter only if it belongs to the given user.
func (r *MeterRepo) GetByIDForUser(meterID, userID string) (*model.Meter, error) {
	m := &model.Meter{}
	err := r.db.QueryRow(`
		SELECT id, user_id, COALESCE(name,''), meter_number, units_remaining, daily_avg_units, last_reading_at,
		       auto_topup, topup_threshold, topup_amount, updated_at
		FROM meters WHERE id = $1 AND user_id = $2`, meterID, userID).
		Scan(&m.ID, &m.UserID, &m.Name, &m.MeterNumber, &m.UnitsRemaining, &m.DailyAvgUnits, &m.LastReadingAt,
			&m.AutoTopup, &m.TopupThreshold, &m.TopupAmountKsh, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

func (r *MeterRepo) UpdateReading(meterID string, units float64) error {
	_, err := r.db.Exec(`
		UPDATE meters SET units_remaining = $1, last_reading_at = now(), updated_at = now()
		WHERE id = $2`, units, meterID)
	return err
}

func (r *MeterRepo) UpdateDailyAvg(meterID string, avgUnits float64) error {
	_, err := r.db.Exec(
		`UPDATE meters SET daily_avg_units = $1, updated_at = now() WHERE id = $2`,
		avgUnits, meterID)
	return err
}

func (r *MeterRepo) UpdateSettings(meterID string, s *model.MeterSettings) error {
	_, err := r.db.Exec(`
		UPDATE meters SET auto_topup = $1, topup_threshold = $2, topup_amount = $3, updated_at = now()
		WHERE id = $4`, s.AutoTopup, s.TopupThreshold, s.TopupAmountKsh, meterID)
	return err
}

// InsertUsageHistory saves a point-in-time reading for trend analysis.
func (r *MeterRepo) InsertUsageHistory(h *model.UsageHistory) error {
	_, err := r.db.Exec(
		`INSERT INTO usage_history (id, meter_id, units_remaining, recorded_at) VALUES ($1, $2, $3, $4)`,
		h.ID, h.MeterID, h.UnitsRemaining, h.RecordedAt)
	return err
}

// GetRecentHistory fetches the last N readings for prediction calculations.
func (r *MeterRepo) GetRecentHistory(meterID string, limit int) ([]*model.UsageHistory, error) {
	rows, err := r.db.Query(`
		SELECT id, meter_id, units_remaining, recorded_at
		FROM usage_history WHERE meter_id = $1
		ORDER BY recorded_at DESC LIMIT $2`, meterID, limit)
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
