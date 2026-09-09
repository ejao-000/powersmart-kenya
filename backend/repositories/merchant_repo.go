package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

// MerchantRepo persists merchant profiles and their float ledger.
type MerchantRepo struct {
	db *sql.DB
}

func NewMerchantRepo(db *sql.DB) *MerchantRepo {
	return &MerchantRepo{db: db}
}

// ── Profiles ─────────────────────────────────────────────────────────────────

func (r *MerchantRepo) CreateProfile(p *model.MerchantProfile) error {
	_, err := r.db.Exec(`
		INSERT INTO merchant_profiles (id, user_id, business_name, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, now(), now())`,
		p.ID, p.UserID, p.BusinessName, p.Status)
	return err
}

func (r *MerchantRepo) GetByUser(userID string) (*model.MerchantProfile, error) {
	p := &model.MerchantProfile{}
	err := r.db.QueryRow(`
		SELECT mp.id, mp.user_id, mp.business_name, mp.status, mp.created_at, mp.updated_at, u.name
		FROM merchant_profiles mp
		JOIN users u ON u.id = mp.user_id
		WHERE mp.user_id = $1`, userID).
		Scan(&p.ID, &p.UserID, &p.BusinessName, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.UserName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *MerchantRepo) GetByID(id string) (*model.MerchantProfile, error) {
	p := &model.MerchantProfile{}
	err := r.db.QueryRow(`
		SELECT mp.id, mp.user_id, mp.business_name, mp.status, mp.created_at, mp.updated_at, u.name
		FROM merchant_profiles mp
		JOIN users u ON u.id = mp.user_id
		WHERE mp.id = $1`, id).
		Scan(&p.ID, &p.UserID, &p.BusinessName, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.UserName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// ListProfiles returns every merchant profile (for the admin console).
func (r *MerchantRepo) ListProfiles() ([]*model.MerchantProfile, error) {
	rows, err := r.db.Query(`
		SELECT mp.id, mp.user_id, mp.business_name, mp.status, mp.created_at, mp.updated_at, u.name
		FROM merchant_profiles mp
		JOIN users u ON u.id = mp.user_id
		ORDER BY mp.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.MerchantProfile
	for rows.Next() {
		p := &model.MerchantProfile{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.BusinessName, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.UserName); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *MerchantRepo) SetStatus(id, status string) error {
	_, err := r.db.Exec(`
		UPDATE merchant_profiles SET status = $1, updated_at = now() WHERE id = $2`, status, id)
	return err
}

// ── Float ledger ─────────────────────────────────────────────────────────────

func (r *MerchantRepo) AddLedger(e *model.MerchantLedger) error {
	_, err := r.db.Exec(`
		INSERT INTO merchant_ledger (id, user_id, type, amount_ksh, reference, customer_account, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		e.ID, e.UserID, e.Type, e.AmountKsh, e.Reference, e.CustomerAccount)
	return err
}

// FloatBalance returns current float = top-ups minus sales.
func (r *MerchantRepo) FloatBalance(userID string) (int, error) {
	var balance int
	err := r.db.QueryRow(`
		SELECT
			COALESCE((SELECT SUM(amount_ksh) FROM merchant_ledger WHERE user_id = $1 AND type = 'topup'), 0) -
			COALESCE((SELECT SUM(amount_ksh) FROM merchant_ledger WHERE user_id = $1 AND type = 'sale'), 0)`, userID).
		Scan(&balance)
	return balance, err
}

// SalesSummary returns the merchant's total sales count / value and top-up value.
func (r *MerchantRepo) SalesSummary(userID string) (salesCount, salesKsh, topupsKsh int, err error) {
	err = r.db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM merchant_ledger WHERE user_id = $1 AND type = 'sale'),
			(SELECT COALESCE(SUM(amount_ksh),0) FROM merchant_ledger WHERE user_id = $1 AND type = 'sale'),
			(SELECT COALESCE(SUM(amount_ksh),0) FROM merchant_ledger WHERE user_id = $1 AND type = 'topup')`, userID).
		Scan(&salesCount, &salesKsh, &topupsKsh)
	return salesCount, salesKsh, topupsKsh, err
}

// RecentSales returns the merchant's most recent sales for the status view.
func (r *MerchantRepo) RecentSales(userID string, limit int) ([]*model.MerchantLedger, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.db.Query(`
		SELECT id, user_id, type, amount_ksh, COALESCE(reference, ''), COALESCE(customer_account, ''), created_at
		FROM merchant_ledger
		WHERE user_id = $1 AND type = 'sale'
		ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.MerchantLedger
	for rows.Next() {
		e := &model.MerchantLedger{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.Type, &e.AmountKsh, &e.Reference, &e.CustomerAccount, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}
