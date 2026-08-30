package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"powersmart-backend/middleware"
	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/service"
	"powersmart-backend/utils"
)

type TokenHandler struct {
	tokenSvc     *service.TokenService
	bluetoothSvc *service.BluetoothService
}

func NewTokenHandler(db *sql.DB) *TokenHandler {
	tokenRepo := repositories.NewTokenRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	txRepo := repositories.NewTransactionRepo(db)
	userRepo := repositories.NewUserRepo(db)

	return &TokenHandler{
		tokenSvc:     service.NewTokenService(tokenRepo, meterRepo, txRepo, userRepo),
		bluetoothSvc: service.NewBluetoothService(tokenRepo),
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
	if tokens == nil {
		tokens = []*model.Token{} // return [] not null
	}
	utils.RespondJSON(w, http.StatusOK, tokens)
}

// BuyToken POST /api/tokens/buy
func (h *TokenHandler) BuyToken(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.BuyTokenRequest
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

// Transfer POST /api/tokens/transfer — send token value to another registered meter.
func (h *TokenHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.TransferTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "Invalid request body")
		return
	}

	token, err := h.tokenSvc.TransferUnits(userID, &req)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusCreated, token)
}

// PushViaBluetooth POST /api/tokens/{id}/push-bluetooth
// Query params: ?action=confirm|fail|request (default request), ?method=wifi|bluetooth (default bluetooth)
func (h *TokenHandler) PushViaBluetooth(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	tokenID := r.PathValue("id")

	action := r.URL.Query().Get("action")
	method := r.URL.Query().Get("method")
	if method != "wifi" && method != "bluetooth" {
		method = "bluetooth"
	}

	var err error
	switch action {
	case "confirm":
		err = h.bluetoothSvc.ConfirmPush(tokenID, userID, method)
	case "fail":
		err = h.bluetoothSvc.ReportPushFailed(tokenID, userID, method)
	default:
		_, err = h.bluetoothSvc.MarkPushRequested(tokenID, userID, method)
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
