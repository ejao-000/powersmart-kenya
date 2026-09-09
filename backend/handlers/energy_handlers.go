package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"powersmart-backend/middleware"
	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/service"
	"powersmart-backend/utils"
)

// EnergyHandler exposes the PowerSmart Energy Intelligence endpoints:
//
//	GET    /api/energy/intel                — combined coach + budget + appliance bundle
//	PUT    /api/energy/budget               — set the monthly spend target
//	POST   /api/energy/appliances           — register an appliance
//	PUT    /api/energy/appliances/{id}      — edit an appliance
//	DELETE /api/energy/appliances/{id}      — remove an appliance
//
// Every endpoint accepts an optional ?meter_id= (or body meter_id) so a landlord
// can analyse each of their units; tenants can omit it and the primary meter is
// used automatically.
type EnergyHandler struct {
	svc *service.EnergyService
}

func NewEnergyHandler(db *sql.DB) *EnergyHandler {
	meterRepo := repositories.NewMeterRepo(db)
	energyRepo := repositories.NewEnergyRepo(db)
	usageSvc := service.NewUsageService(meterRepo)
	predSvc := service.NewPredictionService(meterRepo)
	return &EnergyHandler{svc: service.NewEnergyService(energyRepo, meterRepo, usageSvc, predSvc)}
}

// Intel godoc
// GET /api/energy/intel
func (h *EnergyHandler) Intel(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	meterID := r.URL.Query().Get("meter_id")

	intel, err := h.svc.Intel(userID, meterID)
	if err != nil {
		h.writeMeterError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, intel)
}

// SaveBudget godoc
// PUT /api/energy/budget
//
// Body: { "meter_id": "…", "monthly_budget_ksh": 2000 } (meter_id optional)
func (h *EnergyHandler) SaveBudget(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.SaveBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	budget, err := h.svc.SaveBudget(userID, req.MeterID, req.MonthlyBudgetKsh)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		h.writeMeterError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, budget)
}

// CreateAppliance godoc
// POST /api/energy/appliances
//
// Body: { "meter_id": "…", "name": "Refrigerator", "watts": 150, "hours_per_day": 24 }
func (h *EnergyHandler) CreateAppliance(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.ApplianceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	app, err := h.svc.CreateAppliance(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		h.writeMeterError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, app)
}

// UpdateAppliance godoc
// PUT /api/energy/appliances/{id}
//
// Body (all optional): { "name": "…", "watts": 2000, "hours_per_day": 1.5 }
func (h *EnergyHandler) UpdateAppliance(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	appID := r.PathValue("id")

	var patch model.AppliancePatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	app, err := h.svc.UpdateAppliance(userID, appID, &patch)
	if err != nil {
		switch {
		case errors.Is(err, repositories.ErrNotFound):
			utils.RespondNotFound(w, "appliance")
		case errors.Is(err, service.ErrForbidden):
			utils.RespondForbidden(w, "you do not own this appliance")
		case errors.Is(err, service.ErrInvalid):
			utils.RespondBadRequest(w, err.Error())
		default:
			utils.RespondInternalError(w)
		}
		return
	}
	utils.RespondJSON(w, http.StatusOK, app)
}

// DeleteAppliance godoc
// DELETE /api/energy/appliances/{id}
func (h *EnergyHandler) DeleteAppliance(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	appID := r.PathValue("id")

	err := h.svc.DeleteAppliance(userID, appID)
	if err != nil {
		switch {
		case errors.Is(err, repositories.ErrNotFound):
			utils.RespondNotFound(w, "appliance")
		case errors.Is(err, service.ErrForbidden):
			utils.RespondForbidden(w, "you do not own this appliance")
		default:
			utils.RespondInternalError(w)
		}
		return
	}
	utils.RespondNoContent(w)
}

// writeMeterError maps resolve/load errors from the service onto HTTP codes.
func (h *EnergyHandler) writeMeterError(w http.ResponseWriter, err error) {
	if errors.Is(err, repositories.ErrNotFound) {
		utils.RespondNotFound(w, "meter")
		return
	}
	utils.RespondInternalError(w)
}
