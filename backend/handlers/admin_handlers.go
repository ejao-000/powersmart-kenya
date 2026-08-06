package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"powersmart-backend/utils"
)

// AdminHandler exposes administrative, role-restricted endpoints.
// All routes must be wrapped with middleware.RequireRole(model.RoleAdmin).
type AdminHandler struct {
	db *sql.DB
}

func NewAdminHandler(db *sql.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// Stats godoc
// GET /api/admin/stats  [admin only]
//
// Returns global operational counts used by the admin dashboard.
func (h *AdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats := struct {
		Users           int `json:"users"`
		Tenants         int `json:"tenants"`
		Landlords       int `json:"landlords"`
		Admins          int `json:"admins"`
		Meters          int `json:"meters"`
		Tokens          int `json:"tokens"`
		Transactions    int `json:"transactions"`
		PendingTx       int `json:"pending_transactions"`
		SuccessfulTx    int `json:"successful_transactions"`
		FailedTx        int `json:"failed_transactions"`
		ActiveAlerts    int `json:"active_alerts"`
	}{
		Users:        h.count("SELECT COUNT(*) FROM users"),
		Tenants:      h.count("SELECT COUNT(*) FROM users WHERE role = 'tenant'"),
		Landlords:    h.count("SELECT COUNT(*) FROM users WHERE role = 'landlord'"),
		Admins:       h.count("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
		Meters:       h.count("SELECT COUNT(*) FROM meters"),
		Tokens:       h.count("SELECT COUNT(*) FROM tokens WHERE deleted = 0"),
		Transactions: h.count("SELECT COUNT(*) FROM transactions"),
		PendingTx:    h.count("SELECT COUNT(*) FROM transactions WHERE status = 'pending'"),
		SuccessfulTx: h.count("SELECT COUNT(*) FROM transactions WHERE status = 'success'"),
		FailedTx:     h.count("SELECT COUNT(*) FROM transactions WHERE status = 'failed'"),
		ActiveAlerts: h.count("SELECT COUNT(*) FROM alerts WHERE enabled = 1"),
	}

	utils.RespondSuccess(w, http.StatusOK, stats)
}

// ── Data views ────────────────────────────────────────────────────────────

type adminUserView struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	MeterAccount string    `json:"meter_account"`
	CreatedAt    time.Time `json:"created_at"`
}

// Users godoc
// GET /api/admin/users  [admin only]
//
// Lists every registered account, newest first.
func (h *AdminHandler) Users(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, name, email, phone, role, meter_account, created_at
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	defer rows.Close()

	list := []adminUserView{}
	for rows.Next() {
		u := adminUserView{}
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.MeterAccount, &u.CreatedAt); err != nil {
			utils.RespondInternalError(w)
			return
		}
		list = append(list, u)
	}

	utils.RespondJSON(w, http.StatusOK, list)
}

type adminMeterView struct {
	ID            string     `json:"id"`
	MeterNumber   string     `json:"meter_number"`
	UnitsRemaining float64   `json:"units_remaining"`
	AutoTopup     bool       `json:"auto_topup"`
	OwnerName     string     `json:"owner_name"`
	OwnerEmail    string     `json:"owner_email"`
	UpdatedAt     *time.Time `json:"updated_at"`
}

// Meters godoc
// GET /api/admin/meters  [admin only]
//
// Lists every meter with its owner.
func (h *AdminHandler) Meters(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT m.id, m.meter_number, m.units_remaining, m.auto_topup, m.updated_at,
		       COALESCE(u.name, ''), COALESCE(u.email, '')
		FROM meters m
		LEFT JOIN users u ON u.id = m.user_id
		ORDER BY m.updated_at DESC`)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	defer rows.Close()

	list := []adminMeterView{}
	for rows.Next() {
		m := adminMeterView{}
		if err := rows.Scan(&m.ID, &m.MeterNumber, &m.UnitsRemaining, &m.AutoTopup, &m.UpdatedAt, &m.OwnerName, &m.OwnerEmail); err != nil {
			utils.RespondInternalError(w)
			return
		}
		list = append(list, m)
	}

	utils.RespondJSON(w, http.StatusOK, list)
}

type adminTokenView struct {
	ID           string     `json:"id"`
	TokenNumber  string     `json:"token_number"`
	Units        float64    `json:"units"`
	AmountKsh    int        `json:"amount_ksh"`
	PushStatus   string     `json:"push_status"`
	OwnerEmail   string     `json:"owner_email"`
	PurchasedAt  time.Time  `json:"purchased_at"`
}

// Tokens godoc
// GET /api/admin/tokens  [admin only]
//
// Lists the most recent 50 tokens issued across all users.
func (h *AdminHandler) Tokens(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT t.id, t.token_number, t.units, t.amount_ksh, t.push_status, t.purchased_at,
		       COALESCE(u.email, '')
		FROM tokens t
		LEFT JOIN users u ON u.id = t.user_id
		WHERE t.deleted = 0
		ORDER BY t.purchased_at DESC
		LIMIT 50`)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	defer rows.Close()

	list := []adminTokenView{}
	for rows.Next() {
		t := adminTokenView{}
		if err := rows.Scan(&t.ID, &t.TokenNumber, &t.Units, &t.AmountKsh, &t.PushStatus, &t.PurchasedAt, &t.OwnerEmail); err != nil {
			utils.RespondInternalError(w)
			return
		}
		list = append(list, t)
	}

	utils.RespondJSON(w, http.StatusOK, list)
}

type adminTxView struct {
	ID          string    `json:"id"`
	Channel     string    `json:"channel"`
	AmountKsh   int       `json:"amount_ksh"`
	Reference   string    `json:"reference"`
	Status      string    `json:"status"`
	OwnerEmail  string    `json:"owner_email"`
	CreatedAt   time.Time `json:"created_at"`
}

// Transactions godoc
// GET /api/admin/transactions  [admin only]
//
// Lists the most recent 50 payment transactions across all users.
func (h *AdminHandler) Transactions(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT t.id, t.channel, t.amount_ksh, t.reference, t.status, t.created_at,
		       COALESCE(u.email, '')
		FROM transactions t
		LEFT JOIN users u ON u.id = t.user_id
		ORDER BY t.created_at DESC
		LIMIT 50`)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	defer rows.Close()

	list := []adminTxView{}
	for rows.Next() {
		t := adminTxView{}
		if err := rows.Scan(&t.ID, &t.Channel, &t.AmountKsh, &t.Reference, &t.Status, &t.CreatedAt, &t.OwnerEmail); err != nil {
			utils.RespondInternalError(w)
			return
		}
		list = append(list, t)
	}

	utils.RespondJSON(w, http.StatusOK, list)
}

func (h *AdminHandler) count(query string) int {
	var n int
	if err := h.db.QueryRow(query).Scan(&n); err != nil {
		return 0
	}
	return n
}
