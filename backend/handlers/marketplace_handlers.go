package handlers

import (
	"database/sql"
	"net/http"

	"powersmart-backend/middleware"
	"powersmart-backend/repositories"
	"powersmart-backend/service"
	"powersmart-backend/utils"
)

// MarketplaceHandler exposes the energy-saving marketplace:
//
//	GET /api/marketplace — product catalogue + personalised recommendations
type MarketplaceHandler struct {
	svc *service.MarketplaceService
}

func NewMarketplaceHandler(db *sql.DB) *MarketplaceHandler {
	marketRepo := repositories.NewMarketplaceRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	energyRepo := repositories.NewEnergyRepo(db)
	usageSvc := service.NewUsageService(meterRepo)
	return &MarketplaceHandler{
		svc: service.NewMarketplaceService(marketRepo, meterRepo, energyRepo, usageSvc),
	}
}

// Browse godoc
// GET /api/marketplace
func (h *MarketplaceHandler) Browse(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	browse, err := h.svc.Browse(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, browse)
}
