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

// PoolHandler exposes the Power Pool (shared electricity wallet) endpoints:
//
//	POST   /api/pools                       — create a pool for one of my meters
//	GET    /api/pools                       — list pools I belong to
//	GET    /api/pools/{id}                  — pool detail (members + ledger)
//	POST   /api/pools/join                  — join with an invite code
//	POST   /api/pools/{id}/contributions    — add money to the pool wallet
//	POST   /api/pools/{id}/purchase         — buy a token from the pool balance
//	POST   /api/pools/{id}/members          — add a member by email (owner/admin)
//	PATCH  /api/pools/{id}/members/{member} — update a member's role/permissions
//	DELETE /api/pools/{id}/members/{member} — remove a member / leave the pool
type PoolHandler struct {
	svc *service.PoolService
}

func NewPoolHandler(db *sql.DB) *PoolHandler {
	poolRepo := repositories.NewPoolRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	userRepo := repositories.NewUserRepo(db)
	tokenRepo := repositories.NewTokenRepo(db)
	txRepo := repositories.NewTransactionRepo(db)

	tokenSvc := service.NewTokenService(tokenRepo, meterRepo, txRepo, userRepo)
	return &PoolHandler{svc: service.NewPoolService(poolRepo, meterRepo, userRepo, tokenSvc)}
}

// Create godoc
// POST /api/pools
func (h *PoolHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.CreatePoolRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	pool, err := h.svc.CreatePool(userID, &req)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, pool)
}

// List godoc
// GET /api/pools
func (h *PoolHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	pools, err := h.svc.ListPools(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, pools)
}

// Detail godoc
// GET /api/pools/{id}
func (h *PoolHandler) Detail(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")

	detail, err := h.svc.Detail(userID, poolID)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, detail)
}

// Join godoc
// POST /api/pools/join
func (h *PoolHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.JoinPoolRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	detail, err := h.svc.Join(userID, req.InviteCode)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, detail)
}

// Contribute godoc
// POST /api/pools/{id}/contributions
func (h *PoolHandler) Contribute(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")

	var req model.AddPoolContributionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	contribution, err := h.svc.Contribute(userID, poolID, &req)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, contribution)
}

// Purchase godoc
// POST /api/pools/{id}/purchase
func (h *PoolHandler) Purchase(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")

	var req model.PurchaseWithPoolRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	result, err := h.svc.Purchase(userID, poolID, req.AmountKsh)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, result)
}

// AddMember godoc
// POST /api/pools/{id}/members
func (h *PoolHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")

	var req model.AddPoolMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	member, err := h.svc.AddMember(userID, poolID, &req)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, member)
}

// UpdateMember godoc
// PATCH /api/pools/{id}/members/{memberId}
func (h *PoolHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")
	memberID := r.PathValue("memberId")

	var req model.UpdatePoolMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	member, err := h.svc.UpdateMember(userID, poolID, memberID, &req)
	if err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, member)
}

// RemoveMember godoc
// DELETE /api/pools/{id}/members/{memberId}
func (h *PoolHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	poolID := r.PathValue("id")
	memberID := r.PathValue("memberId")

	if err := h.svc.RemoveMember(userID, poolID, memberID); err != nil {
		h.writeError(w, err)
		return
	}
	utils.RespondNoContent(w)
}

func (h *PoolHandler) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.RespondNotFound(w, "pool")
	case errors.Is(err, repositories.ErrDuplicate):
		utils.RespondConflict(w, err.Error())
	case errors.Is(err, service.ErrForbidden):
		utils.RespondForbidden(w, err.Error())
	case errors.Is(err, service.ErrPoolOwnerFixed):
		utils.RespondBadRequest(w, err.Error())
	case errors.Is(err, service.ErrPoolInsufficient):
		utils.RespondBadRequest(w, err.Error())
	case errors.Is(err, service.ErrInvalid):
		utils.RespondBadRequest(w, err.Error())
	default:
		utils.RespondInternalError(w)
	}
}
