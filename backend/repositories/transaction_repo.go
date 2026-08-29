package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

type TransactionRepo struct {
	db *sql.DB
}

func NewTransactionRepo(db *sql.DB) *TransactionRepo {
	return &TransactionRepo{db: db}
}

// Create inserts a new payment transaction record.
func (r *TransactionRepo) Create(tx *model.Transaction) error {
	// token_id is an optional foreign key — store NULL instead of an empty
	// string so PostgreSQL does not reject the row (SQLSTATE 23503).
	var tokenID sql.NullString
	if tx.TokenID != "" {
		tokenID = sql.NullString{String: tx.TokenID, Valid: true}
	}
	_, err := r.db.Exec(`
		INSERT INTO transactions
			(id, user_id, token_id, channel, phone, amount_ksh, reference, provider_ref, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		tx.ID, tx.UserID, tokenID, tx.Channel, tx.Phone,
		tx.AmountKsh, tx.Reference, tx.ProviderRef, tx.Status,
		tx.CreatedAt, tx.UpdatedAt,
	)
	return err
}

const transactionCols = `id, user_id, token_id, channel, phone, amount_ksh,
	       reference, provider_ref, status, created_at, updated_at`

// scanTransaction maps a query row into a *model.Transaction, treating
// NULL-able columns (token_id, phone, provider_ref) safely.
func scanTransaction(scan func(dest ...interface{}) error) (*model.Transaction, error) {
	tx := &model.Transaction{}
	var tokenID, phone, providerRef sql.NullString
	if err := scan(
		&tx.ID, &tx.UserID, &tokenID, &tx.Channel, &phone,
		&tx.AmountKsh, &tx.Reference, &providerRef, &tx.Status,
		&tx.CreatedAt, &tx.UpdatedAt,
	); err != nil {
		return nil, err
	}
	tx.TokenID = tokenID.String
	tx.Phone = phone.String
	tx.ProviderRef = providerRef.String
	return tx, nil
}

// GetByID fetches a single transaction.
func (r *TransactionRepo) GetByID(id string) (*model.Transaction, error) {
	tx, err := scanTransaction(func(dest ...interface{}) error {
		return r.db.QueryRow(
			`SELECT `+transactionCols+` FROM transactions WHERE id = $1`, id).Scan(dest...)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// GetByReference looks up a transaction by internal reference (used in callbacks).
func (r *TransactionRepo) GetByReference(ref string) (*model.Transaction, error) {
	tx, err := scanTransaction(func(dest ...interface{}) error {
		return r.db.QueryRow(
			`SELECT `+transactionCols+` FROM transactions WHERE reference = $1`, ref).Scan(dest...)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// GetByProviderRef looks up by the external provider reference (M-Pesa CheckoutRequestID etc.).
func (r *TransactionRepo) GetByProviderRef(providerRef string) (*model.Transaction, error) {
	tx, err := scanTransaction(func(dest ...interface{}) error {
		return r.db.QueryRow(
			`SELECT `+transactionCols+` FROM transactions WHERE provider_ref = $1`, providerRef).Scan(dest...)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// ListByUser returns all transactions for a user, newest first.
func (r *TransactionRepo) ListByUser(userID string) ([]*model.Transaction, error) {
	rows, err := r.db.Query(
		`SELECT `+transactionCols+` FROM transactions WHERE user_id = $1
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txns []*model.Transaction
	for rows.Next() {
		tx, err := scanTransaction(rows.Scan)
		if err != nil {
			return nil, err
		}
		txns = append(txns, tx)
	}
	return txns, rows.Err()
}

// UpdateStatus changes the status of a transaction (e.g. pending → success).
func (r *TransactionRepo) UpdateStatus(id string, status model.TransactionStatus, providerRef string) error {
	_, err := r.db.Exec(`
		UPDATE transactions
		SET status = $1, provider_ref = $2, updated_at = now()
		WHERE id = $3`,
		status, providerRef, id)
	return err
}

// LinkToken sets the token_id on a transaction after the token has been generated.
func (r *TransactionRepo) LinkToken(txID, tokenID string) error {
	_, err := r.db.Exec(
		`UPDATE transactions SET token_id = $1, updated_at = now() WHERE id = $2`,
		tokenID, txID)
	return err
}
