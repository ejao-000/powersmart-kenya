package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

// PowerRepo persists power reserves and public "I need power" requests.
type PowerRepo struct {
	db *sql.DB
}

func NewPowerRepo(db *sql.DB) *PowerRepo {
	return &PowerRepo{db: db}
}

// ── Power reserve ────────────────────────────────────────────────────────────

func (r *PowerRepo) GetReserve(meterID string) (float64, error) {
	var v float64
	err := r.db.QueryRow(`SELECT reserved_kwh FROM meter_reserves WHERE meter_id = $1`, meterID).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return v, err
}

func (r *PowerRepo) SetReserve(meterID string, kwh float64) error {
	_, err := r.db.Exec(`
		INSERT INTO meter_reserves (meter_id, reserved_kwh, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (meter_id) DO UPDATE SET reserved_kwh = EXCLUDED.reserved_kwh, updated_at = now()`,
		meterID, kwh)
	return err
}

// ── Power requests ───────────────────────────────────────────────────────────

func (r *PowerRepo) CreatePowerRequest(p *model.PowerRequest) error {
	_, err := r.db.Exec(`
		INSERT INTO power_requests (id, user_id, meter_account, amount_ksh, note, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		p.ID, p.UserID, p.MeterAccount, p.AmountKsh, p.Note, p.Status)
	return err
}

func (r *PowerRepo) GetPowerRequest(id string) (*model.PowerRequest, error) {
	p := &model.PowerRequest{}
	err := r.db.QueryRow(`
		SELECT pr.id, pr.user_id, pr.meter_account, pr.amount_ksh, COALESCE(pr.note, ''),
		       pr.status, COALESCE(pr.fulfilled_by, ''), pr.created_at, pr.fulfilled_at,
		       u.name, COALESCE(fu.name, '')
		FROM power_requests pr
		JOIN users u ON u.id = pr.user_id
		LEFT JOIN users fu ON fu.id = pr.fulfilled_by
		WHERE pr.id = $1`, id).
		Scan(&p.ID, &p.UserID, &p.MeterAccount, &p.AmountKsh, &p.Note,
			&p.Status, &p.FulfilledBy, &p.CreatedAt, &p.FulfilledAt,
			&p.RequesterName, &p.HelperName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func scanRequests(rows *sql.Rows) ([]*model.PowerRequest, error) {
	var list []*model.PowerRequest
	for rows.Next() {
		p := &model.PowerRequest{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.MeterAccount, &p.AmountKsh, &p.Note,
			&p.Status, &p.FulfilledBy, &p.CreatedAt, &p.FulfilledAt,
			&p.RequesterName, &p.HelperName); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

const powerRequestSelect = `
	SELECT pr.id, pr.user_id, pr.meter_account, pr.amount_ksh, COALESCE(pr.note, ''),
	       pr.status, COALESCE(pr.fulfilled_by, ''), pr.created_at, pr.fulfilled_at,
	       u.name, COALESCE(fu.name, '')
	FROM power_requests pr
	JOIN users u ON u.id = pr.user_id
	LEFT JOIN users fu ON fu.id = pr.fulfilled_by`

// OpenPowerRequests returns open help requests (newest first).
func (r *PowerRepo) OpenPowerRequests() ([]*model.PowerRequest, error) {
	rows, err := r.db.Query(powerRequestSelect + ` WHERE pr.status = 'open' ORDER BY pr.created_at DESC LIMIT 30`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRequests(rows)
}

// PowerRequestsByUser returns the requests a user created (any status).
func (r *PowerRepo) PowerRequestsByUser(userID string) ([]*model.PowerRequest, error) {
	rows, err := r.db.Query(powerRequestSelect+` WHERE pr.user_id = $1 ORDER BY pr.created_at DESC LIMIT 30`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRequests(rows)
}

func (r *PowerRepo) MarkFulfilled(id, helperID string) error {
	_, err := r.db.Exec(`
		UPDATE power_requests SET status = 'fulfilled', fulfilled_by = $2, fulfilled_at = now()
		WHERE id = $1 AND status = 'open'`, id, helperID)
	return err
}

func (r *PowerRepo) MarkCancelled(id string) error {
	_, err := r.db.Exec(`UPDATE power_requests SET status = 'cancelled' WHERE id = $1`, id)
	return err
}
