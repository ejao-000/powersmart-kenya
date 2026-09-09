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

// InsightsHandler exposes landlord-facing intelligence endpoints:
//
//	GET /api/insights                 — per-unit usage comparison + anomaly flags
//	GET /api/reports/monthly?month=…  — monthly token-spend statement (JSON)
//
// Both work for any owner (tenants see their single meter; landlords see the
// whole portfolio).
type InsightsHandler struct {
	svc *service.InsightsService
}

func NewInsightsHandler(db *sql.DB) *InsightsHandler {
	meterRepo := repositories.NewMeterRepo(db)
	tokenRepo := repositories.NewTokenRepo(db)
	usageSvc := service.NewUsageService(meterRepo)
	return &InsightsHandler{svc: service.NewInsightsService(meterRepo, tokenRepo, usageSvc)}
}

// Insights godoc
// GET /api/insights
func (h *InsightsHandler) Insights(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	bundle, err := h.svc.Insights(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, bundle)
}

// MonthlyReport godoc
// GET /api/reports/monthly?month=2026-09
func (h *InsightsHandler) MonthlyReport(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	period := r.URL.Query().Get("month")

	report, err := h.svc.MonthlyReport(userID, period)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondNotFound(w, "report")
			return
		}
		utils.RespondBadRequest(w, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusOK, report)
}
