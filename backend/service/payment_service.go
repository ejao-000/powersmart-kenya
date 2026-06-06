package services

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
)

// ── Errors ────────────────────────────────────────────────────────────────────

var (
	ErrPaymentFailed     = errors.New("payment initiation failed")
	ErrCallbackInvalid   = errors.New("callback payload is invalid")
	ErrTransactionNotFound = errors.New("transaction not found")
)

// ── Initiate-payment request (shared across channels) ────────────────────────

// PaymentInitRequest is the unified request body for all payment channels.
type PaymentInitRequest struct {
	AmountKsh int    `json:"amount_ksh"`
	Phone     string `json:"phone"`       // required for M-Pesa / Airtel
	Channel   string `json:"channel"`     // "mpesa" | "airtel" | "bank"
}

// PaymentInitResponse is returned to the frontend after initiating a payment.
type PaymentInitResponse struct {
	TransactionID string `json:"transaction_id"`
	Reference     string `json:"reference"`
	Channel       string `json:"channel"`
	Status        string `json:"status"`
	Message       string `json:"message"`
	// For bank channel: virtual account details
	BankAccount   string `json:"bank_account,omitempty"`
	BankName      string `json:"bank_name,omitempty"`
	BankReference string `json:"bank_reference,omitempty"`
}

// ── PaymentService ────────────────────────────────────────────────────────────

// PaymentService orchestrates payment initiation and callback handling for
// three channels: Safaricom M-Pesa (Daraja STK Push), Airtel Money, and bank.
//
// Environment variables required:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
//   MPESA_PASSKEY, MPESA_CALLBACK_URL,
//   AIRTEL_API_KEY, AIRTEL_CALLBACK_URL,
//   BANK_ACCOUNT_NUMBER, BANK_NAME
type PaymentService struct {
	txRepo     *repositories.TransactionRepo
	tokenSvc   *TokenService
	httpClient *http.Client
}

func NewPaymentService(
	txRepo *repositories.TransactionRepo,
	tokenSvc *TokenService,
) *PaymentService {
	return &PaymentService{
		txRepo:     txRepo,
		tokenSvc:   tokenSvc,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ── M-Pesa ────────────────────────────────────────────────────────────────────

// InitiateMpesa triggers a Safaricom Daraja STK Push to the customer's phone.
// The payment is confirmed asynchronously via HandleMpesaCallback.
func (s *PaymentService) InitiateMpesa(userID string, req *PaymentInitRequest) (*PaymentInitResponse, error) {
	if err := s.validateMobilePayment(req); err != nil {
		return nil, err
	}

	// 1. Get OAuth token from Daraja
	accessToken, err := s.mpesaAccessToken()
	if err != nil {
		return nil, fmt.Errorf("%w: could not authenticate with M-Pesa: %v", ErrPaymentFailed, err)
	}

	// 2. Build STK Push payload
	shortcode  := os.Getenv("MPESA_SHORTCODE")
	passkey    := os.Getenv("MPESA_PASSKEY")
	callbackURL := os.Getenv("MPESA_CALLBACK_URL")
	timestamp  := time.Now().Format("20060102150405")
	password   := base64.StdEncoding.EncodeToString([]byte(shortcode + passkey + timestamp))
	internalRef := newRef("MP")

	stkBody := map[string]interface{}{
		"BusinessShortCode": shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            strconv.Itoa(req.AmountKsh),
		"PartyA":            normalisePhone(req.Phone),
		"PartyB":            shortcode,
		"PhoneNumber":       normalisePhone(req.Phone),
		"CallBackURL":       callbackURL,
		"AccountReference":  internalRef,
		"TransactionDesc":   "PowerSmart token purchase",
	}

	bodyBytes, _ := json.Marshal(stkBody)

	httpReq, _ := http.NewRequest("POST",
		"https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
		strings.NewReader(string(bodyBytes)))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrPaymentFailed, err)
	}
	defer resp.Body.Close()

	var stkResp struct {
		MerchantRequestID string `json:"MerchantRequestID"`
		CheckoutRequestID string `json:"CheckoutRequestID"`
		ResponseCode      string `json:"ResponseCode"`
		ResponseDesc      string `json:"ResponseDescription"`
		CustomerMessage   string `json:"CustomerMessage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&stkResp); err != nil {
		return nil, fmt.Errorf("%w: invalid Daraja response", ErrPaymentFailed)
	}
	if stkResp.ResponseCode != "0" {
		return nil, fmt.Errorf("%w: %s", ErrPaymentFailed, stkResp.ResponseDesc)
	}

	// 3. Persist pending transaction; token is created after callback confirms payment
	tx := &models.Transaction{
		ID:          uuid.NewString(),
		UserID:      userID,
		Channel:     models.ChannelMpesa,
		Phone:       req.Phone,
		AmountKsh:   req.AmountKsh,
		Reference:   internalRef,
		ProviderRef: stkResp.CheckoutRequestID,
		Status:      models.TxPending,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.txRepo.Create(tx); err != nil {
		return nil, fmt.Errorf("failed to save transaction: %w", err)
	}

	return &PaymentInitResponse{
		TransactionID: tx.ID,
		Reference:     internalRef,
		Channel:       "mpesa",
		Status:        "pending",
		Message:       stkResp.CustomerMessage,
	}, nil
}

// mpesaAccessToken fetches a short-lived OAuth2 token from the Daraja API.
func (s *PaymentService) mpesaAccessToken() (string, error) {
	key    := os.Getenv("MPESA_CONSUMER_KEY")
	secret := os.Getenv("MPESA_CONSUMER_SECRET")
	creds  := base64.StdEncoding.EncodeToString([]byte(key + ":" + secret))

	req, _ := http.NewRequest("GET",
		"https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", nil)
	req.Header.Set("Authorization", "Basic "+creds)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.AccessToken == "" {
		return "", errors.New("empty access token returned by Daraja")
	}
	return result.AccessToken, nil
}

// HandleMpesaCallback processes the asynchronous payment result from Safaricom.
// Called by POST /api/payments/mpesa/callback (public — no JWT required).
func (s *PaymentService) HandleMpesaCallback(body *models.MpesaCallback) error {
	stk := body.Body.STKCallback

	// Find the pending transaction by CheckoutRequestID
	tx, err := s.txRepo.GetByProviderRef(stk.CheckoutRequestID)
	if err != nil {
		return fmt.Errorf("%w: checkout_request_id=%s", ErrTransactionNotFound, stk.CheckoutRequestID)
	}

	if stk.ResultCode != 0 {
		// Payment failed or was cancelled by user
		log.Printf("[mpesa_callback] payment failed for tx %s: %s", tx.ID, stk.ResultDesc)
		return s.txRepo.UpdateStatus(tx.ID, models.TxFailed, stk.CheckoutRequestID)
	}

	// Payment succeeded — extract M-Pesa receipt number from metadata
	mpesaReceipt := extractMpesaMeta(stk.CallbackMetadata, "MpesaReceiptNumber")
	log.Printf("[mpesa_callback] payment confirmed for tx %s, receipt: %s", tx.ID, mpesaReceipt)

	if err := s.txRepo.UpdateStatus(tx.ID, models.TxSuccess, mpesaReceipt); err != nil {
		return fmt.Errorf("failed to update transaction status: %w", err)
	}

	// Fetch updated transaction and issue the KP token
	tx.ProviderRef = mpesaReceipt
	tx.Status     = models.TxSuccess
	if _, err := s.tokenSvc.FinaliseTokenAfterPayment(tx); err != nil {
		log.Printf("[mpesa_callback] token issuance failed for tx %s: %v", tx.ID, err)
		// Don't return error — payment was received; retry token issuance manually
	}

	return nil
}

// ── Airtel Money ──────────────────────────────────────────────────────────────

// InitiateAirtel sends a payment request to Airtel Money.
func (s *PaymentService) InitiateAirtel(userID string, req *PaymentInitRequest) (*PaymentInitResponse, error) {
	if err := s.validateMobilePayment(req); err != nil {
		return nil, err
	}

	apiKey      := os.Getenv("AIRTEL_API_KEY")
	callbackURL := os.Getenv("AIRTEL_CALLBACK_URL")
	internalRef := newRef("AT")

	airtelBody := map[string]interface{}{
		"reference":    internalRef,
		"subscriber": map[string]string{
			"country": "KE",
			"currency": "KES",
			"msisdn":  normalisePhone(req.Phone),
		},
		"transaction": map[string]interface{}{
			"amount":   req.AmountKsh,
			"country":  "KE",
			"currency": "KES",
			"id":       internalRef,
		},
	}

	bodyBytes, _ := json.Marshal(airtelBody)
	httpReq, _ := http.NewRequest("POST",
		"https://openapi.airtel.africa/merchant/v1/payments/",
		strings.NewReader(string(bodyBytes)))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Country", "KE")
	httpReq.Header.Set("X-Currency", "KES")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("X-Callback-URL", callbackURL)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrPaymentFailed, err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("%w: Airtel returned %d: %s", ErrPaymentFailed, resp.StatusCode, string(raw))
	}

	var airtelResp struct {
		Data struct {
			Transaction struct {
				ID     string `json:"id"`
				Status string `json:"status"`
			} `json:"transaction"`
		} `json:"data"`
		Status struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"status"`
	}
	if err := json.Unmarshal(raw, &airtelResp); err != nil {
		return nil, fmt.Errorf("%w: invalid Airtel response", ErrPaymentFailed)
	}

	tx := &models.Transaction{
		ID:          uuid.NewString(),
		UserID:      userID,
		Channel:     models.ChannelAirtel,
		Phone:       req.Phone,
		AmountKsh:   req.AmountKsh,
		Reference:   internalRef,
		ProviderRef: airtelResp.Data.Transaction.ID,
		Status:      models.TxPending,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.txRepo.Create(tx); err != nil {
		return nil, fmt.Errorf("failed to save transaction: %w", err)
	}

	return &PaymentInitResponse{
		TransactionID: tx.ID,
		Reference:     internalRef,
		Channel:       "airtel",
		Status:        "pending",
		Message:       "Check your Airtel Money app to confirm the payment",
	}, nil
}

// HandleAirtelCallback processes Airtel's async payment notification.
func (s *PaymentService) HandleAirtelCallback(payload map[string]interface{}) error {
	// Airtel sends: {"transaction": {"id": "...", "status": "TS", "airtel_money_id": "..."}}
	txMap, ok := payload["transaction"].(map[string]interface{})
	if !ok {
		return ErrCallbackInvalid
	}

	providerRef, _ := txMap["id"].(string)
	status, _       := txMap["status"].(string) // "TS" = success, "TF" = failure

	tx, err := s.txRepo.GetByProviderRef(providerRef)
	if err != nil {
		return fmt.Errorf("%w: provider_ref=%s", ErrTransactionNotFound, providerRef)
	}

	if status != "TS" {
		log.Printf("[airtel_callback] payment failed for tx %s, status: %s", tx.ID, status)
		return s.txRepo.UpdateStatus(tx.ID, models.TxFailed, providerRef)
	}

	airtelMoneyID, _ := txMap["airtel_money_id"].(string)
	if err := s.txRepo.UpdateStatus(tx.ID, models.TxSuccess, airtelMoneyID); err != nil {
		return err
	}

	tx.Status      = models.TxSuccess
	tx.ProviderRef = airtelMoneyID
	if _, err := s.tokenSvc.FinaliseTokenAfterPayment(tx); err != nil {
		log.Printf("[airtel_callback] token issuance failed for tx %s: %v", tx.ID, err)
	}
	return nil
}

// ── Bank transfer ─────────────────────────────────────────────────────────────

// InitiateBank creates a pending transaction and returns virtual bank account
// details. The customer completes the transfer via their bank; an ops team
// (or future webhook) manually confirms via UpdateStatus.
func (s *PaymentService) InitiateBank(userID string, req *PaymentInitRequest) (*PaymentInitResponse, error) {
	if req.AmountKsh < 50 {
		return nil, fmt.Errorf("minimum bank payment is Ksh 50")
	}

	internalRef := newRef("BK")
	bankAccount := os.Getenv("BANK_ACCOUNT_NUMBER")
	bankName    := os.Getenv("BANK_NAME")
	if bankAccount == "" {
		bankAccount = "1234567890"
		bankName    = "Equity Bank"
	}

	tx := &models.Transaction{
		ID:          uuid.NewString(),
		UserID:      userID,
		Channel:     models.ChannelBank,
		AmountKsh:   req.AmountKsh,
		Reference:   internalRef,
		ProviderRef: "",
		Status:      models.TxPending,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.txRepo.Create(tx); err != nil {
		return nil, fmt.Errorf("failed to save transaction: %w", err)
	}

	return &PaymentInitResponse{
		TransactionID: tx.ID,
		Reference:     internalRef,
		Channel:       "bank",
		Status:        "pending",
		Message: fmt.Sprintf(
			"Transfer Ksh %d to %s account %s, using reference %s. Tokens are issued after payment is confirmed (usually within 1 business day).",
			req.AmountKsh, bankName, bankAccount, internalRef,
		),
		BankAccount:   bankAccount,
		BankName:      bankName,
		BankReference: internalRef,
	}, nil
}

// ── Shared helpers ────────────────────────────────────────────────────────────

func (s *PaymentService) validateMobilePayment(req *PaymentInitRequest) error {
	if req.AmountKsh < 50 {
		return fmt.Errorf("minimum purchase amount is Ksh 50")
	}
	if req.Phone == "" {
		return fmt.Errorf("phone number is required")
	}
	return nil
}

// normalisePhone converts 07XXXXXXXX → 2547XXXXXXXX for Safaricom/Airtel APIs.
func normalisePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	if strings.HasPrefix(phone, "0") {
		return "254" + phone[1:]
	}
	if strings.HasPrefix(phone, "+") {
		return phone[1:]
	}
	return phone
}

// newRef generates a short unique internal reference with a channel prefix.
func newRef(prefix string) string {
	return fmt.Sprintf("PS-%s-%s", prefix, strings.ToUpper(uuid.NewString()[:8]))
}

// extractMpesaMeta pulls a named value out of the M-Pesa callback metadata array.
func extractMpesaMeta(meta *struct {
	Item []struct {
		Name  string      `json:"Name"`
		Value interface{} `json:"Value"`
	} `json:"Item"`
}, name string) string {
	if meta == nil {
		return ""
	}
	for _, item := range meta.Item {
		if item.Name == name {
			return fmt.Sprintf("%v", item.Value)
		}
	}
	return ""
}
