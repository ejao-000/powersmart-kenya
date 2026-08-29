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
