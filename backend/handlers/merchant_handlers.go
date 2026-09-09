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

// MerchantHandler exposes vendor (agent) mode endpoints:
//
//	POST /api/merchant/apply  — register my shop as a vendor
//	GET  /api/merchant/me     — my profile, float and recent sales
//	POST /api/merchant/float  — top up my vending float
//	POST /api/merchant/vend   — sell a token to a customer's meter account
//
// Admin endpoints (also here, routed behind admin-only middleware):
//
//	GET  /api/admin/merchants         — list all vendor accounts
//	POST /api/admin/merchants/{id}/status — approve / suspend
type MerchantHandler struct {
	svc *service.MerchantService
}

func NewMerchantHandler(db *sql.DB) *MerchantHandler {
	merchantRepo := repositories.NewMerchantRepo(db)
	userRepo := repositories.NewUserRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	tokenRepo := repositories.NewTokenRepo(db)
	txRepo := repositories.NewTransactionRepo(db)
	tokenSvc := service.NewTokenService(tokenRepo, meterRepo, txRepo, userRepo)
	return &MerchantHandler{svc: service.NewMerchantService(merchantRepo, userRepo, meterRepo, tokenSvc)}
}

// Apply godoc
// POST /api/merchant/apply
func (h *MerchantHandler) Apply(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.ApplyMerchantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	profile, err := h.svc.Apply(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, profile)
}

// Me godoc
// GET /api/merchant/me
func (h *MerchantHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	status, err := h.svc.Status(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, status)
}

// TopUp godoc
// POST /api/merchant/float
func (h *MerchantHandler) TopUp(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.FloatTopupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	status, err := h.svc.TopUpFloat(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		h.writeMerchantError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, status)
}

// Vend godoc
// POST /api/merchant/vend
func (h *MerchantHandler) Vend(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.VendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	result, err := h.svc.Vend(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		h.writeMerchantError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, result)
}

// ListAdmin godoc
// GET /api/admin/merchants
func (h *MerchantHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	merchants, err := h.svc.ListMerchants()
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, merchants)
}

// SetStatusAdmin godoc
// POST /api/admin/merchants/{id}/status
func (h *MerchantHandler) SetStatusAdmin(w http.ResponseWriter, r *http.Request) {
	profileID := r.PathValue("id")

	var req model.SetMerchantStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	profile, err := h.svc.SetMerchantStatus(profileID, req.Status)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondNotFound(w, "merchant")
			return
		}
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, profile)
}

func (h *MerchantHandler) writeMerchantError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.RespondNotFound(w, "merchant")
	case errors.Is(err, service.ErrForbidden):
		utils.RespondForbidden(w, err.Error())
	case errors.Is(err, service.ErrInvalid):
		utils.RespondBadRequest(w, err.Error())
	default:
		utils.RespondInternalError(w)
	}
}
