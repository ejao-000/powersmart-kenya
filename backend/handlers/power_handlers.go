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

// PowerHandler exposes the emergency power features:
//
//	GET  /api/meter/reserve              — current reserve state
//	PUT  /api/meter/reserve              — set the emergency reserve (kWh)
//	POST /api/meter/reserve/release      — unlock the reserve
//	POST /api/power-requests             — ask the community for emergency power
//	GET  /api/power-requests             — open requests + my own
//	POST /api/power-requests/{id}/fulfill — send power to a requester
//	POST /api/power-requests/{id}/cancel — cancel my open request
type PowerHandler struct {
	svc *service.PowerService
}

func NewPowerHandler(db *sql.DB) *PowerHandler {
	powerRepo := repositories.NewPowerRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	userRepo := repositories.NewUserRepo(db)
	tokenRepo := repositories.NewTokenRepo(db)
	txRepo := repositories.NewTransactionRepo(db)
	tokenSvc := service.NewTokenService(tokenRepo, meterRepo, txRepo, userRepo)
	return &PowerHandler{svc: service.NewPowerService(powerRepo, meterRepo, userRepo, tokenSvc)}
}

// Reserve godoc
// GET /api/meter/reserve
func (h *PowerHandler) Reserve(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	view, err := h.svc.Reserve(userID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, view)
}

// SetReserve godoc
// PUT /api/meter/reserve
func (h *PowerHandler) SetReserve(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.SetReserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	view, err := h.svc.SetReserve(userID, req.ReservedKwh)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, view)
}

// ReleaseReserve godoc
// POST /api/meter/reserve/release
func (h *PowerHandler) ReleaseReserve(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	view, err := h.svc.ReleaseReserve(userID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, view)
}

// CreateRequest godoc
// POST /api/power-requests
func (h *PowerHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.CreatePowerRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	p, err := h.svc.CreatePowerRequest(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, p)
}

// ListRequests godoc
// GET /api/power-requests
func (h *PowerHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	bundle, err := h.svc.ListPowerRequests(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, bundle)
}

// FulfilRequest godoc
// POST /api/power-requests/{id}/fulfill
func (h *PowerHandler) FulfilRequest(w http.ResponseWriter, r *http.Request) {
	helperID := middleware.UserIDFromCtx(r.Context())
	reqID := r.PathValue("id")

	result, err := h.svc.FulfilPowerRequest(helperID, reqID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, result)
}

// CancelRequest godoc
// POST /api/power-requests/{id}/cancel
func (h *PowerHandler) CancelRequest(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.UserIDFromCtx(r.Context())
	reqID := r.PathValue("id")

	if err := h.svc.CancelPowerRequest(ownerID, reqID); err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (h *PowerHandler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.RespondNotFound(w, "request")
	case errors.Is(err, service.ErrForbidden):
		utils.RespondForbidden(w, err.Error())
	case errors.Is(err, service.ErrInvalid):
		utils.RespondBadRequest(w, err.Error())
	default:
		utils.RespondInternalError(w)
	}
}
