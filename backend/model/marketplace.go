package model

import "time"

// ── Energy Marketplace ───────────────────────────────────────────────────────
//
// Connects users with energy-saving products and services. The AI recommends
// items based on the user's Energy Intelligence data (appliance mix, spend and
// carbon) and explains why each product fits their home.

// MarketplaceProduct is a purchasable energy-saving product or service.
type MarketplaceProduct struct {
	ID                 string    `json:"id"`
	Category           string    `json:"category"` // solar | lighting | appliances | smart | water | services
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	PriceKsh           int       `json:"price_ksh"`
	EstSavingsKshMonth float64   `json:"est_savings_ksh_month"`
	Active             bool      `json:"-"`
	CreatedAt          time.Time `json:"created_at"`
}

// MarketplaceRecommendation pairs a product with the reason it was suggested.
type MarketplaceRecommendation struct {
	Product *MarketplaceProduct `json:"product"`
	Basis   string              `json:"basis"` // which signal drove the suggestion
	Reason  string              `json:"reason"`
}

// MarketplaceBrowse is the payload for GET /api/marketplace.
type MarketplaceBrowse struct {
	Products        []*MarketplaceProduct        `json:"products"`
	Recommendations []*MarketplaceRecommendation `json:"recommendations"`
	GeneratedAt     time.Time                    `json:"generated_at"`
}
