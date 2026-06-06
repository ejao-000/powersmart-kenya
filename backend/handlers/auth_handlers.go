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

// AuthHandler exposes:
//   POST /api/auth/register   — create account with KP meter account number
//   POST /api/auth/login      — exchange credentials for JWT
//   GET  /api/auth/me         — return the authenticated user profile
//   POST /api/auth/logout     — client-side JWT discard (stateless; server acks)
type AuthHandler struct {
	authSvc  *services.AuthService
	userRepo *repositories.UserRepo
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	userRepo  := repositories.NewUserRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	kpv       := utils.NewKPValidator()

	return &AuthHandler{
		authSvc:  services.NewAuthService(userRepo, meterRepo, kpv),
		userRepo: userRepo,
	}
}

// Register godoc
// POST /api/auth/register
//
// Validates the Kenya Power meter account number via the KP lookup API before
// allowing registration. Only genuine KP prepaid customers can sign up.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	// Basic field presence checks (full validation lives in the service layer)
	if req.Name == "" || req.Email == "" || req.Phone == "" || req.Password == "" || req.MeterAccount == "" {
		utils.RespondBadRequest(w, "name, email, phone, password and meter_account are all required")
		return
	}
	if len(req.Password) < 8 {
		utils.RespondBadRequest(w, "password must be at least 8 characters")
		return
	}

	resp, err := h.authSvc.Register(&req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidMeterAccount):
			utils.RespondUnprocessable(w, err.Error())
		case errors.Is(err, services.ErrAccountTaken):
			utils.RespondConflict(w, err.Error())
		default:
			utils.RespondError(w, http.StatusInternalServerError, "registration failed: "+err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusCreated, resp)
}

// Login godoc
// POST /api/auth/login
//
// Returns a signed JWT valid for 30 days. The client must include it as
// "Authorization: Bearer <token>" on all protected requests.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	if req.Email == "" || req.Password == "" {
		utils.RespondBadRequest(w, "email and password are required")
		return
	}

	resp, err := h.authSvc.Login(&req)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			// Return 401 for both "user not found" and "wrong password"
			// so attackers cannot enumerate registered emails.
			utils.RespondUnauthorized(w, "invalid email or password")
			return
		}
		utils.RespondInternalError(w)
		return
	}

	utils.RespondJSON(w, http.StatusOK, resp)
}

// Me godoc
// GET /api/auth/me  [protected]
//
// Returns the full profile of the authenticated user.
// The JWT is validated by RequireAuth middleware before this handler runs.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	if userID == "" {
		utils.RespondUnauthorized(w, "not authenticated")
		return
	}

	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			// JWT references a deleted account
			utils.RespondUnauthorized(w, "account no longer exists")
			return
		}
		utils.RespondInternalError(w)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, user)
}

// Logout godoc
// POST /api/auth/logout  [protected]
//
// JWTs are stateless — there is no server-side session to destroy. This endpoint
// exists so the frontend has a clean API to call; the client must discard the
// token locally. A future implementation may add a token denylist here.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	utils.RespondMessage(w, http.StatusOK, "logged out successfully — please discard your token")
}
 