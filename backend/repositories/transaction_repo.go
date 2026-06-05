package repositories

import (
	"database/sql"
	"errors"

	"github.com/powersmart/models"
)

type TransactionRepo struct {
	db *sql.DB
}

func NewTransactionRepo(db *sql.DB) *TransactionRepo {
	return &TransactionRepo{db: db}
}

// Create inserts a new payment transaction record.
func (r *TransactionRepo) Create(tx *models.Transaction) error {
	_, err := r.db.Exec(`
		INSERT INTO transactions
			(id, user_id, token_id, channel, phone, amount_ksh, reference, provider_ref, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		tx.ID, tx.UserID, tx.TokenID, tx.Channel, tx.Phone,
		tx.AmountKsh, tx.Reference, tx.ProviderRef, tx.Status,
		tx.CreatedAt, tx.UpdatedAt,
	)
	return err
}

// GetByID fetches a single transaction.
func (r *TransactionRepo) GetByID(id string) (*models.Transaction, error) {
	tx := &models.Transaction{}
	err := r.db.QueryRow(`
		SELECT id, user_id, token_id, channel, phone, amount_ksh,
		       reference, provider_ref, status, created_at, updated_at
		FROM transactions WHERE id = ?`, id).
		Scan(&tx.ID, &tx.UserID, &tx.TokenID, &tx.Channel, &tx.Phone,
			&tx.AmountKsh, &tx.Reference, &tx.ProviderRef, &tx.Status,
			&tx.CreatedAt, &tx.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// GetByReference looks up a transaction by internal reference (used in callbacks).
func (r *TransactionRepo) GetByReference(ref string) (*models.Transaction, error) {
	tx := &models.Transaction{}
	err := r.db.QueryRow(`
		SELECT id, user_id, token_id, channel, phone, amount_ksh,
		       reference, provider_ref, status, created_at, updated_at
		FROM transactions WHERE reference = ?`, ref).
		Scan(&tx.ID, &tx.UserID, &tx.TokenID, &tx.Channel, &tx.Phone,
			&tx.AmountKsh, &tx.Reference, &tx.ProviderRef, &tx.Status,
			&tx.CreatedAt, &tx.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// GetByProviderRef looks up by the external provider reference (M-Pesa CheckoutRequestID etc.).
func (r *TransactionRepo) GetByProviderRef(providerRef string) (*models.Transaction, error) {
	tx := &models.Transaction{}
	err := r.db.QueryRow(`
		SELECT id, user_id, token_id, channel, phone, amount_ksh,
		       reference, provider_ref, status, created_at, updated_at
		FROM transactions WHERE provider_ref = ?`, providerRef).
		Scan(&tx.ID, &tx.UserID, &tx.TokenID, &tx.Channel, &tx.Phone,
			&tx.AmountKsh, &tx.Reference, &tx.ProviderRef, &tx.Status,
			&tx.CreatedAt, &tx.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return tx, err
}

// ListByUser returns all transactions for a user, newest first.
func (r *TransactionRepo) ListByUser(userID string) ([]*models.Transaction, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, token_id, channel, phone, amount_ksh,
		       reference, provider_ref, status, created_at, updated_at
		FROM transactions WHERE user_id = ?
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txns []*models.Transaction
	for rows.Next() {
		tx := &models.Transaction{}
		if err := rows.Scan(
			&tx.ID, &tx.UserID, &tx.TokenID, &tx.Channel, &tx.Phone,
			&tx.AmountKsh, &tx.Reference, &tx.ProviderRef, &tx.Status,
			&tx.CreatedAt, &tx.UpdatedAt,
		); err != nil {
			return nil, err
		}
		txns = append(txns, tx)
	}
	return txns, rows.Err()
}

// UpdateStatus changes the status of a transaction (e.g. pending → success).
func (r *TransactionRepo) UpdateStatus(id string, status models.TransactionStatus, providerRef string) error {
	_, err := r.db.Exec(`
		UPDATE transactions
		SET status = ?, provider_ref = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`,
		status, providerRef, id)
	return err
}

// LinkToken sets the token_id on a transaction after the token has been generated.
func (r *TransactionRepo) LinkToken(txID, tokenID string) error {
	_, err := r.db.Exec(
		`UPDATE transactions SET token_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		tokenID, txID)
	return err
}
