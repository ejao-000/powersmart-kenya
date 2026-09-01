package handlers

import (
	"database/sql"
	"errors"
	"net/http"

	"powersmart-backend/middleware"
	"powersmart-backend/repositories"
	"powersmart-backend/service"
	"powersmart-backend/utils"
)

type UsageHandler struct {
	usageSvc *service.UsageService
}

func NewUsageHandler(db *sql.DB) *UsageHandler {
	meterRepo := repositories.NewMeterRepo(db)
	return &UsageHandler{usageSvc: service.NewUsageService(meterRepo)}
}

// Summary GET /api/meter/usage
//
// Returns daily / weekly / monthly consumption for the authenticated tenant's
// primary meter, plus a 30-day series for charts. All figures are estimates
// derived from recorded telemetry and the assumed domestic tariff.
func (h *UsageHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	summary, err := h.usageSvc.Summarize(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondError(w, http.StatusNotFound, "Meter not found")
			return
		}
		utils.RespondError(w, http.StatusInternalServerError, "Failed to compute usage summary")
		return
	}

	utils.RespondJSON(w, http.StatusOK, summary)
}
