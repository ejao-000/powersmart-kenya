package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

var ErrNotFound = errors.New("record not found")
var ErrDuplicate = errors.New("record already exists")

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(u *model.User) error {
	_, err := r.db.Exec(`
		INSERT INTO users (id, name, email, phone, password, meter_account, meter_number, role, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		u.ID, u.Name, u.Email, u.Phone, u.Password,
		u.MeterAccount, u.MeterNumber, u.Role, u.CreatedAt,
	)
	return err
}

func (r *UserRepo) GetByEmail(email string) (*model.User, error) {
	u := &model.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, role, created_at
		FROM users WHERE email = $1`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepo) GetByID(id string) (*model.User, error) {
	u := &model.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, role, created_at
		FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepo) GetByMeterAccount(account string) (*model.User, error) {
	u := &model.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, role, created_at
		FROM users WHERE meter_account = $1`, account).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// UpdateNeighborhood stores the user's estate / area for local challenges.
func (r *UserRepo) UpdateNeighborhood(userID, neighborhood string) error {
	_, err := r.db.Exec(`UPDATE users SET neighborhood = $1 WHERE id = $2`, neighborhood, userID)
	return err
}

// GetNeighborhood returns the user's saved neighborhood ('' when unset).
func (r *UserRepo) GetNeighborhood(userID string) (string, error) {
	var n string
	err := r.db.QueryRow(`SELECT COALESCE(neighborhood, '') FROM users WHERE id = $1`, userID).Scan(&n)
	return n, err
}

// NeighborhoodLeaderboard ranks neighborhoods by challenge points earned by
// their residents (only neighborhoods with active savers appear).
func (r *UserRepo) NeighborhoodLeaderboard() ([]*model.NeighborhoodRow, error) {
	rows, err := r.db.Query(`
		SELECT COALESCE(NULLIF(u.neighborhood, ''), 'Unset') AS hood,
		       SUM(cp.points) AS points,
		       COUNT(DISTINCT cp.user_id) AS members
		FROM challenge_points cp
		JOIN users u ON u.id = cp.user_id
		GROUP BY hood
		ORDER BY points DESC
		LIMIT 30`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.NeighborhoodRow
	for rows.Next() {
		row := &model.NeighborhoodRow{}
		if err := rows.Scan(&row.Name, &row.Points, &row.Members); err != nil {
			return nil, err
		}
		list = append(list, row)
	}
	return list, rows.Err()
}
