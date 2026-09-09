package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

// BackupRepo persists a user's backup power sources.
type BackupRepo struct {
	db *sql.DB
}

func NewBackupRepo(db *sql.DB) *BackupRepo {
	return &BackupRepo{db: db}
}

func (r *BackupRepo) ListByUser(userID string) ([]*model.BackupSource, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, type, COALESCE(name, ''), capacity_kwh, charge_pct, created_at, updated_at
		FROM backup_sources WHERE user_id = $1 ORDER BY created_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.BackupSource
	for rows.Next() {
		s := &model.BackupSource{}
		if err := rows.Scan(&s.ID, &s.UserID, &s.Type, &s.Name, &s.CapacityKwh, &s.ChargePct, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *BackupRepo) GetByUserAndType(userID, kind string) (*model.BackupSource, error) {
	s := &model.BackupSource{}
	err := r.db.QueryRow(`
		SELECT id, user_id, type, COALESCE(name, ''), capacity_kwh, charge_pct, created_at, updated_at
		FROM backup_sources WHERE user_id = $1 AND type = $2`, userID, kind).
		Scan(&s.ID, &s.UserID, &s.Type, &s.Name, &s.CapacityKwh, &s.ChargePct, &s.CreatedAt, &s.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// Upsert inserts or updates one source per (user, type).
func (r *BackupRepo) Upsert(s *model.BackupSource) error {
	_, err := r.db.Exec(`
		INSERT INTO backup_sources (id, user_id, type, name, capacity_kwh, charge_pct, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now(), now())
		ON CONFLICT (user_id, type) DO UPDATE
		  SET name = EXCLUDED.name, capacity_kwh = EXCLUDED.capacity_kwh,
		      charge_pct = EXCLUDED.charge_pct, updated_at = now()`,
		s.ID, s.UserID, s.Type, s.Name, s.CapacityKwh, s.ChargePct)
	return err
}

func (r *BackupRepo) Delete(id, userID string) error {
	res, err := r.db.Exec(`DELETE FROM backup_sources WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
