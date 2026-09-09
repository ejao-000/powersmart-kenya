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

// SavingsHandler exposes the Savings Hub endpoints:
//
//	GET    /api/goals                   — my reduction goals with live progress
//	POST   /api/goals                   — create a goal (target < current spend)
//	POST   /api/goals/{id}/complete     — mark a goal achieved
//	DELETE /api/goals/{id}              — remove a goal
//	GET    /api/challenges              — weekly challenges + my status
//	POST   /api/challenges/{key}/claim  — verify + claim weekly points
//	GET    /api/challenges/leaderboard  — top scorers + my standing
//	GET    /api/impact/carbon           — CO₂ estimate for my primary meter
type SavingsHandler struct {
	svc *service.SavingsService
}

func NewSavingsHandler(db *sql.DB) *SavingsHandler {
	meterRepo := repositories.NewMeterRepo(db)
	userRepo := repositories.NewUserRepo(db)
	usageSvc := service.NewUsageService(meterRepo)
	energyRepo := repositories.NewEnergyRepo(db)
	savingsRepo := repositories.NewSavingsRepo(db)
	return &SavingsHandler{
		svc: service.NewSavingsService(meterRepo, savingsRepo, userRepo, usageSvc, energyRepo),
	}
}

// ListGoals godoc
// GET /api/goals
func (h *SavingsHandler) ListGoals(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	goals, err := h.svc.ListGoals(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, goals)
}

// CreateGoal godoc
// POST /api/goals
func (h *SavingsHandler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	goal, err := h.svc.CreateGoal(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, goal)
}

// CompleteGoal godoc
// POST /api/goals/{id}/complete
func (h *SavingsHandler) CompleteGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	goalID := r.PathValue("id")

	err := h.svc.CompleteGoal(userID, goalID)
	if err != nil {
		h.writeSavingsError(w, err)
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "achieved"})
}

// DeleteGoal godoc
// DELETE /api/goals/{id}
func (h *SavingsHandler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	goalID := r.PathValue("id")

	err := h.svc.DeleteGoal(userID, goalID)
	if err != nil {
		h.writeSavingsError(w, err)
		return
	}
	utils.RespondNoContent(w)
}

// ListChallenges godoc
// GET /api/challenges
func (h *SavingsHandler) ListChallenges(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	challenges, err := h.svc.ListChallenges(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, challenges)
}

// ClaimChallenge godoc
// POST /api/challenges/{key}/claim
func (h *SavingsHandler) ClaimChallenge(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	key := r.PathValue("key")

	challenge, err := h.svc.ClaimChallenge(userID, key)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, challenge)
}

// Leaderboard godoc
// GET /api/challenges/leaderboard
func (h *SavingsHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	resp, err := h.svc.Leaderboard(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, resp)
}

// Carbon godoc
// GET /api/impact/carbon
func (h *SavingsHandler) Carbon(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	carbon, err := h.svc.Carbon(userID)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, carbon)
}

func (h *SavingsHandler) writeSavingsError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.RespondNotFound(w, "goal")
	case errors.Is(err, service.ErrForbidden):
		utils.RespondForbidden(w, "you do not own this goal")
	case errors.Is(err, service.ErrInvalid):
		utils.RespondBadRequest(w, err.Error())
	default:
		utils.RespondInternalError(w)
	}
}
