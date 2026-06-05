package repositories

import (
	"database/sql"
	"errors"

	"github.com/powersmart/models"
)

type TokenRepo struct {
	db *sql.DB
}

func NewTokenRepo(db *sql.DB) *TokenRepo {
	return &TokenRepo{db: db}
}

func (r *TokenRepo) Create(t *models.Token) error {
	_, err := r.db.Exec(`
		INSERT INTO tokens
			(id, user_id, meter_id, token_number, units, amount_ksh, payment_ref, push_status, purchased_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, t.UserID, t.MeterID, t.TokenNumber, t.Units,
		t.AmountKsh, t.PaymentRef, t.PushStatus, t.PurchasedAt,
	)
	return err
}

// ListByUser returns all non-deleted tokens for a user, newest first.
func (r *TokenRepo) ListByUser(userID string) ([]*models.Token, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, meter_id, token_number, units, amount_ksh,
		       payment_ref, pushed_at, push_status, purchased_at
		FROM tokens
		WHERE user_id = ? AND deleted = 0
		ORDER BY purchased_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*models.Token
	for rows.Next() {
		t := &models.Token{}
		err := rows.Scan(
			&t.ID, &t.UserID, &t.MeterID, &t.TokenNumber, &t.Units,
			&t.AmountKsh, &t.PaymentRef, &t.PushedAt, &t.PushStatus, &t.PurchasedAt,
		)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

func (r *TokenRepo) GetByID(id string) (*models.Token, error) {
	t := &models.Token{}
	err := r.db.QueryRow(`
		SELECT id, user_id, meter_id, token_number, units, amount_ksh,
		       payment_ref, pushed_at, push_status, purchased_at
		FROM tokens WHERE id = ? AND deleted = 0`, id).
		Scan(&t.ID, &t.UserID, &t.MeterID, &t.TokenNumber, &t.Units,
			&t.AmountKsh, &t.PaymentRef, &t.PushedAt, &t.PushStatus, &t.PurchasedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// SoftDelete marks a token as deleted (user history clear) without removing the DB row.
func (r *TokenRepo) SoftDelete(id, userID string) error {
	res, err := r.db.Exec(
		`UPDATE tokens SET deleted = 1 WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdatePushStatus records the outcome of a Bluetooth push attempt.
func (r *TokenRepo) UpdatePushStatus(id string, status models.PushStatus, pushedAt interface{}) error {
	_, err := r.db.Exec(
		`UPDATE tokens SET push_status = ?, pushed_at = ? WHERE id = ?`,
		status, pushedAt, id)
	return err
}
