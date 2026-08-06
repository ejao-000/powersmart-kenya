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

// AuthHandler exposes:
//   POST /api/auth/register   — create account with KP meter account number
//   POST /api/auth/login      — exchange credentials for JWT
//   GET  /api/auth/me         — return the authenticated user profile
//   POST /api/auth/logout     — client-side JWT discard (stateless; server acks)
type AuthHandler struct {
	authSvc  *service.AuthService
	userRepo *repositories.UserRepo
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	userRepo  := repositories.NewUserRepo(db)
	meterRepo := repositories.NewMeterRepo(db)
	kpv       := utils.NewKPValidator()

	return &AuthHandler{
		authSvc:  service.NewAuthService(userRepo, meterRepo, kpv),
		userRepo: userRepo,
	}
}

// Register godoc
// POST /api/auth/register
//
// Validates the Kenya Power meter account number via the KP lookup API before
// allowing registration. Only genuine KP prepaid customers can sign up.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	// Basic field presence checks (full validation lives in the service layer)
	if req.Name == "" || req.Email == "" || req.Phone == "" || req.Password == "" || req.MeterAccount == "" {
		utils.RespondBadRequest(w, "name, email, phone, password and meter_account are all required")
		return
	}

	// Input hygiene & format validation
	name, err := utils.ValidateName(req.Name)
	if err != nil {
		utils.RespondBadRequest(w, err.Error())
		return
	}
	req.Name = name

	if !utils.ValidEmail(req.Email) {
		utils.RespondBadRequest(w, "a valid email address is required")
		return
	}
	req.Email = utils.NormaliseEmail(req.Email)

	if !utils.ValidKenyanPhone(req.Phone) {
		utils.RespondBadRequest(w, "a valid Kenyan phone number is required (e.g. 0712345678 or +254712345678)")
		return
	}

	if err := utils.ValidatePassword(req.Password); err != nil {
		utils.RespondBadRequest(w, err.Error())
		return
	}

	// Role validation — only tenant and landlord are self-registrable
	if req.Role != "" && req.Role != string(model.RoleTenant) && req.Role != string(model.RoleLandlord) {
		utils.RespondBadRequest(w, "role must be 'tenant' or 'landlord'")
		return
	}
	if req.Role == "" {
		req.Role = string(model.RoleTenant)
	}

	resp, err := h.authSvc.Register(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidMeterAccount):
			utils.RespondUnprocessable(w, err.Error())
		case errors.Is(err, service.ErrAccountTaken):
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
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	if req.Email == "" || req.Password == "" {
		utils.RespondBadRequest(w, "email and password are required")
		return
	}
	req.Email = utils.NormaliseEmail(req.Email)

	resp, err := h.authSvc.Login(&req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
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

// AdminLogin godoc
// POST /api/auth/admin-login
//
// Dedicated sign-in for administrators only. Returns 403 if the account is not
// an admin, so regular portal credentials cannot open the admin console.
func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	if req.Email == "" || req.Password == "" {
		utils.RespondBadRequest(w, "admin email and password are required")
		return
	}
	req.Email = utils.NormaliseEmail(req.Email)

	resp, err := h.authSvc.AdminLogin(&req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			utils.RespondUnauthorized(w, "invalid email or password")
		case errors.Is(err, service.ErrNotAdmin):
			utils.RespondForbidden(w, "this account does not have admin privileges")
		default:
			utils.RespondInternalError(w)
		}
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
 