package repositories

import (
	"database/sql"

	"powersmart-backend/model"
)

type OutageRepo struct {
	db *sql.DB
}

func NewOutageRepo(db *sql.DB) *OutageRepo {
	return &OutageRepo{db: db}
}

// Create inserts a new outage report.
func (r *OutageRepo) Create(o *model.Outage) error {
	_, err := r.db.Exec(`
		INSERT INTO outages (id, user_id, reporter_name, area, latitude, longitude, description, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		o.ID, o.UserID, o.ReporterName, o.Area, o.Latitude,
		o.Longitude, o.Description, o.Status, o.CreatedAt,
	)
	return err
}

// ListRecent returns the most recent outage reports, newest first.
func (r *OutageRepo) ListRecent(limit int) ([]*model.Outage, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Query(`
		SELECT id, user_id, COALESCE(reporter_name, ''), area, latitude, longitude,
		       COALESCE(description, ''), status, created_at
		FROM outages
		ORDER BY created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.Outage
	for rows.Next() {
		o := &model.Outage{}
		if err := rows.Scan(
			&o.ID, &o.UserID, &o.ReporterName, &o.Area, &o.Latitude,
			&o.Longitude, &o.Description, &o.Status, &o.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, rows.Err()
}
