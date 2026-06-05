package repositories

import (
	"database/sql"
	"errors"

	"github.com/powersmart/models"
)

var ErrNotFound = errors.New("record not found")
var ErrDuplicate = errors.New("record already exists")

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(u *models.User) error {
	_, err := r.db.Exec(`
		INSERT INTO users (id, name, email, phone, password, meter_account, meter_number, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		u.ID, u.Name, u.Email, u.Phone, u.Password,
		u.MeterAccount, u.MeterNumber, u.CreatedAt,
	)
	return err
}

func (r *UserRepo) GetByEmail(email string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, created_at
		FROM users WHERE email = ?`, email).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepo) GetByID(id string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, created_at
		FROM users WHERE id = ?`, id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *UserRepo) GetByMeterAccount(account string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(`
		SELECT id, name, email, phone, password, meter_account, meter_number, created_at
		FROM users WHERE meter_account = ?`, account).
		Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Password,
			&u.MeterAccount, &u.MeterNumber, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}
