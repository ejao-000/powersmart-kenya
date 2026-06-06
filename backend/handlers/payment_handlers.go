package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/powersmart/middleware"
	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
	"github.com/powersmart/services"
	"github.com/powersmart/utils"
)

// PaymentHandler exposes:
//   POST /api/payments/mpesa/initiate    [protected] — trigger STK push
//   POST /api/payments/airtel/initiate   [protected] — trigger Airtel prompt
//   POST /api/payments/bank/initiate     [protected] — return bank account details
//   POST /api/payments/mpesa/callback    [public]    — Safaricom async callback
//   POST /api/payments/airtel/callback   [public]    — Airtel async callback
type PaymentHandler struct {
	paymentSvc *services.PaymentService
}

func NewPaymentHandler(db *sql.DB) *PaymentHandler {
	tokenRepo := repositories.NewTokenRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	txRepo    := repositories.NewTransactionRepo(db)

	// TokenService is a dependency of PaymentService (issues token after payment)
	tokenSvc   := services.NewTokenService(tokenRepo, meterRepo, txRepo)
	paymentSvc := services.NewPaymentService(txRepo, tokenSvc)

	return &PaymentHandler{paymentSvc: paymentSvc}
}

// ── Initiate routes (protected) ───────────────────────────────────────────────

// InitiateMpesa godoc
// POST /api/payments/mpesa/initiate
//
// Body: { "amount_ksh": 200, "phone": "0712345678" }
//
// Triggers a Safaricom STK Push to the user's phone. The payment is confirmed
// asynchronously via the /mpesa/callback endpoint.
func (h *PaymentHandler) InitiateMpesa(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req services.PaymentInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	req.Channel = "mpesa"

	resp, err := h.paymentSvc.InitiateMpesa(userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPaymentFailed):
			utils.RespondError(w, http.StatusBadGateway, err.Error())
		default:
			utils.RespondBadRequest(w, err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusAccepted, resp)
}

// InitiateAirtel godoc
// POST /api/payments/airtel/initiate
//
// Body: { "amount_ksh": 200, "phone": "0733000000" }
//
// Sends an Airtel Money payment prompt to the user's phone.
func (h *PaymentHandler) InitiateAirtel(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req services.PaymentInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	req.Channel = "airtel"

	resp, err := h.paymentSvc.InitiateAirtel(userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPaymentFailed):
			utils.RespondError(w, http.StatusBadGateway, err.Error())
		default:
			utils.RespondBadRequest(w, err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusAccepted, resp)
}

// InitiateBank godoc
// POST /api/payments/bank/initiate
//
// Body: { "amount_ksh": 500 }
//
// Returns virtual bank account details. The customer completes the transfer
// manually; tokens are issued once payment is confirmed.
func (h *PaymentHandler) InitiateBank(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req services.PaymentInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	req.Channel = "bank"

	resp, err := h.paymentSvc.InitiateBank(userID, &req)
	if err != nil {
		utils.RespondBadRequest(w, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusCreated, resp)
}

// ── Callback routes (public — called by payment providers) ───────────────────

// MpesaCallback godoc
// POST /api/payments/mpesa/callback
//
// Safaricom Daraja posts the payment result here. No JWT is required.
// The endpoint must return HTTP 200 promptly; Safaricom retries on non-200.
func (h *PaymentHandler) MpesaCallback(w http.ResponseWriter, r *http.Request) {
	var body models.MpesaCallback
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		// Always return 200 to stop Safaricom retrying with malformed data
		utils.RespondJSON(w, http.StatusOK, map[string]string{"ResultCode": "0", "ResultDesc": "Accepted"})
		return
	}

	if err := h.paymentSvc.HandleMpesaCallback(&body); err != nil {
		if errors.Is(err, services.ErrTransactionNotFound) {
			// Unknown reference — ack so Safaricom does not retry
			utils.RespondJSON(w, http.StatusOK, map[string]string{"ResultCode": "0", "ResultDesc": "Unknown transaction"})
			return
		}
		// Log internally but still ack to prevent retry storm
		utils.RespondJSON(w, http.StatusOK, map[string]string{"ResultCode": "0", "ResultDesc": "Processing error"})
		return
	}

	// Safaricom expects this exact shape in the response body
	utils.RespondJSON(w, http.StatusOK, map[string]string{
		"ResultCode": "0",
		"ResultDesc": "Confirmation received successfully",
	})
}

// AirtelCallback godoc
// POST /api/payments/airtel/callback
//
// Airtel posts the payment result here. No JWT is required.
func (h *PaymentHandler) AirtelCallback(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}

	if err := h.paymentSvc.HandleAirtelCallback(payload); err != nil {
		if errors.Is(err, services.ErrTransactionNotFound) {
			utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "unknown"})
			return
		}
		utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "error"})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "success"})
}
