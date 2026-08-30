package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

type TokenRepo struct {
	db *sql.DB
}

func NewTokenRepo(db *sql.DB) *TokenRepo {
	return &TokenRepo{db: db}
}

func (r *TokenRepo) Create(t *model.Token) error {
	_, err := r.db.Exec(`
		INSERT INTO tokens
			(id, user_id, meter_id, token_number, units, amount_ksh, payment_ref, push_status, push_method, purchased_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		t.ID, t.UserID, t.MeterID, t.TokenNumber, t.Units,
		t.AmountKsh, t.PaymentRef, t.PushStatus, t.PushMethod, t.PurchasedAt,
	)
	return err
}

// ListByUser returns all non-deleted tokens for a user, newest first.
func (r *TokenRepo) ListByUser(userID string) ([]*model.Token, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, meter_id, token_number, units, amount_ksh,
		       payment_ref, pushed_at, push_status, push_method, purchased_at
		FROM tokens
		WHERE user_id = $1 AND deleted = 0
		ORDER BY purchased_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*model.Token
	for rows.Next() {
		t := &model.Token{}
		err := rows.Scan(
			&t.ID, &t.UserID, &t.MeterID, &t.TokenNumber, &t.Units,
			&t.AmountKsh, &t.PaymentRef, &t.PushedAt, &t.PushStatus, &t.PushMethod, &t.PurchasedAt,
		)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

func (r *TokenRepo) GetByID(id string) (*model.Token, error) {
	t := &model.Token{}
	err := r.db.QueryRow(`
		SELECT id, user_id, meter_id, token_number, units, amount_ksh,
		       payment_ref, pushed_at, push_status, push_method, purchased_at
		FROM tokens WHERE id = $1 AND deleted = 0`, id).
		Scan(&t.ID, &t.UserID, &t.MeterID, &t.TokenNumber, &t.Units,
			&t.AmountKsh, &t.PaymentRef, &t.PushedAt, &t.PushStatus, &t.PushMethod, &t.PurchasedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// SoftDelete marks a token as deleted (user history clear) without removing the DB row.
func (r *TokenRepo) SoftDelete(id, userID string) error {
	res, err := r.db.Exec(
		`UPDATE tokens SET deleted = 1 WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdatePushStatus records the outcome of a token push attempt and the method
// used to deliver it (wifi or bluetooth).
func (r *TokenRepo) UpdatePushStatus(id string, status model.PushStatus, method string, pushedAt interface{}) error {
	if method == "" {
		method = string(model.PushMethodBluetooth)
	}
	_, err := r.db.Exec(
		`UPDATE tokens SET push_status = $1, push_method = $2, pushed_at = $3 WHERE id = $4`,
		status, method, pushedAt, id)
	return err
}
