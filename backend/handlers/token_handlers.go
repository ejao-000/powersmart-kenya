package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/powersmart/middleware"
	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
	"github.com/powersmart/services"
	"github.com/powersmart/utils"
)

type TokenHandler struct {
	tokenSvc     *services.TokenService
	bluetoothSvc *services.BluetoothService
}

func NewTokenHandler(db *sql.DB) *TokenHandler {
	tokenRepo := repositories.NewTokenRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	txRepo := repositories.NewTransactionRepo(db)

	return &TokenHandler{
		tokenSvc:     services.NewTokenService(tokenRepo, meterRepo, txRepo),
		bluetoothSvc: services.NewBluetoothService(tokenRepo),
	}
}

// ListHistory GET /api/tokens
func (h *TokenHandler) ListHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	tokens, err := h.tokenSvc.ListHistory(userID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch token history")
		return
	}
	utils.RespondJSON(w, http.StatusOK, tokens)
}

// BuyToken POST /api/tokens/buy
func (h *TokenHandler) BuyToken(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req models.BuyTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	token, err := h.tokenSvc.BuyToken(userID, &req)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusCreated, token)
}

// PushViaBluetooth POST /api/tokens/{id}/push-bluetooth
func (h *TokenHandler) PushViaBluetooth(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	tokenID := r.PathValue("id")

	// Determine sub-action from query param: ?action=confirm|fail|request
	action := r.URL.Query().Get("action")

	var err error
	switch action {
	case "confirm":
		err = h.bluetoothSvc.ConfirmPush(tokenID, userID)
	case "fail":
		err = h.bluetoothSvc.ReportPushFailed(tokenID, userID)
	default:
		_, err = h.bluetoothSvc.MarkPushRequested(tokenID, userID)
	}

	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// DeleteFromHistory DELETE /api/tokens/{id}
func (h *TokenHandler) DeleteFromHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	tokenID := r.PathValue("id")

	if err := h.tokenSvc.DeleteFromHistory(tokenID, userID); err != nil {
		utils.RespondError(w, http.StatusNotFound, "Token not found")
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
