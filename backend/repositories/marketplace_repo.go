package repositories

import (
	"database/sql"

	"powersmart-backend/model"
)

// MarketplaceRepo persists the energy-saving product catalogue.
type MarketplaceRepo struct {
	db *sql.DB
}

func NewMarketplaceRepo(db *sql.DB) *MarketplaceRepo {
	return &MarketplaceRepo{db: db}
}

// ListActive returns all purchasable products, cheapest first.
func (r *MarketplaceRepo) ListActive() ([]*model.MarketplaceProduct, error) {
	rows, err := r.db.Query(`
		SELECT id, category, name, COALESCE(description, ''), price_ksh, est_savings_ksh_month, created_at
		FROM marketplace_products
		WHERE active = 1
		ORDER BY price_ksh ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.MarketplaceProduct
	for rows.Next() {
		p := &model.MarketplaceProduct{}
		if err := rows.Scan(&p.ID, &p.Category, &p.Name, &p.Description, &p.PriceKsh, &p.EstSavingsKshMonth, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}
