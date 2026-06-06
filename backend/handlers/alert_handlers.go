package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/powersmart/middleware"
	"github.com/powersmart/models"
	"github.com/powersmart/repositories"
	"github.com/powersmart/utils"
)

// AlertHandler exposes:
//   GET    /api/alerts        [protected] — list all alert rules for the user
//   POST   /api/alerts        [protected] — create a new alert rule
//   PUT    /api/alerts/{id}   [protected] — update an existing rule (threshold, channel, enabled)
//   DELETE /api/alerts/{id}   [protected] — delete an alert rule
type AlertHandler struct {
	alertRepo *alertRepo
}

func NewAlertHandler(db *sql.DB) *AlertHandler {
	return &AlertHandler{alertRepo: newAlertRepo(db)}
}

// List godoc
// GET /api/alerts
//
// Returns all alert rules configured by the authenticated user.
func (h *AlertHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	alerts, err := h.alertRepo.listByUser(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	if alerts == nil {
		alerts = []*models.Alert{} // return [] not null when empty
	}
	utils.RespondSuccess(w, http.StatusOK, alerts)
}

// Create godoc
// POST /api/alerts
//
// Body: { "type": "low_units", "threshold": 10, "channel": "push" }
//
// Supported types:
//   low_units  — fires when kWh remaining drops below threshold
//   days_left  — fires when estimated days remaining drops below threshold
//   auto_topup — system-generated, not user-created
func (h *AlertHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req models.AlertCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	// Validate type
	if req.Type != models.AlertLowUnits && req.Type != models.AlertDaysLeft {
		utils.RespondBadRequest(w, "type must be one of: low_units, days_left")
		return
	}
	// Validate channel
	if req.Channel != models.AlertChannelPush &&
		req.Channel != models.AlertChannelSMS &&
		req.Channel != models.AlertChannelEmail {
		utils.RespondBadRequest(w, "channel must be one of: push, sms, email")
		return
	}
	if req.Threshold <= 0 {
		utils.RespondBadRequest(w, "threshold must be greater than zero")
		return
	}

	// Enforce a sensible cap per type
	if req.Type == models.AlertLowUnits && req.Threshold > 500 {
		utils.RespondBadRequest(w, "low_units threshold cannot exceed 500 kWh")
		return
	}
	if req.Type == models.AlertDaysLeft && req.Threshold > 90 {
		utils.RespondBadRequest(w, "days_left threshold cannot exceed 90 days")
		return
	}

	// Prevent duplicate alert type+channel combinations per user
	existing, _ := h.alertRepo.listByUser(userID)
	for _, a := range existing {
		if a.Type == req.Type && a.Channel == req.Channel {
			utils.RespondConflict(w, "an alert of this type and channel already exists — update it instead")
			return
		}
	}

	alert := &models.Alert{
		ID:        uuid.NewString(),
		UserID:    userID,
		Type:      req.Type,
		Threshold: req.Threshold,
		Channel:   req.Channel,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	if err := h.alertRepo.create(alert); err != nil {
		utils.RespondInternalError(w)
		return
	}

	utils.RespondJSON(w, http.StatusCreated, alert)
}

// Update godoc
// PUT /api/alerts/{id}
//
// Body (all fields optional): { "threshold": 5, "channel": "sms", "enabled": false }
//
// Allows the user to adjust the threshold, switch notification channel, or
// toggle the alert on/off without deleting it.
func (h *AlertHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID  := middleware.UserIDFromCtx(r.Context())
	alertID := r.PathValue("id")

	// Load existing record to verify ownership
	alert, err := h.alertRepo.getByID(alertID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondNotFound(w, "alert")
			return
		}
		utils.RespondInternalError(w)
		return
	}
	if alert.UserID != userID {
		utils.RespondForbidden(w, "you do not own this alert")
		return
	}

	// Decode partial update — only override fields that are present
	var patch struct {
		Threshold *float64            `json:"threshold"`
		Channel   *models.AlertChannel `json:"channel"`
		Enabled   *bool               `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}

	if patch.Threshold != nil {
		if *patch.Threshold <= 0 {
			utils.RespondBadRequest(w, "threshold must be greater than zero")
			return
		}
		alert.Threshold = *patch.Threshold
	}
	if patch.Channel != nil {
		if *patch.Channel != models.AlertChannelPush &&
			*patch.Channel != models.AlertChannelSMS &&
			*patch.Channel != models.AlertChannelEmail {
			utils.RespondBadRequest(w, "channel must be one of: push, sms, email")
			return
		}
		alert.Channel = *patch.Channel
	}
	if patch.Enabled != nil {
		alert.Enabled = *patch.Enabled
	}

	if err := h.alertRepo.update(alert); err != nil {
		utils.RespondInternalError(w)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, alert)
}

// Delete godoc
// DELETE /api/alerts/{id}
//
// Permanently removes an alert rule. The user can re-create it at any time.
func (h *AlertHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID  := middleware.UserIDFromCtx(r.Context())
	alertID := r.PathValue("id")

	alert, err := h.alertRepo.getByID(alertID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondNotFound(w, "alert")
			return
		}
		utils.RespondInternalError(w)
		return
	}
	if alert.UserID != userID {
		utils.RespondForbidden(w, "you do not own this alert")
		return
	}

	if err := h.alertRepo.delete(alertID); err != nil {
		utils.RespondInternalError(w)
		return
	}

	utils.RespondNoContent(w)
}

// ── Internal alert repository (alerts table is simple enough to inline here) ──

type alertRepo struct{ db *sql.DB }

func newAlertRepo(db *sql.DB) *alertRepo { return &alertRepo{db: db} }

func (r *alertRepo) create(a *models.Alert) error {
	_, err := r.db.Exec(`
		INSERT INTO alerts (id, user_id, type, threshold, channel, enabled, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		a.ID, a.UserID, a.Type, a.Threshold, a.Channel, a.Enabled, a.CreatedAt)
	return err
}

func (r *alertRepo) listByUser(userID string) ([]*models.Alert, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, type, threshold, channel, enabled, last_fired_at, created_at
		FROM alerts WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Alert
	for rows.Next() {
		a := &models.Alert{}
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Type, &a.Threshold, &a.Channel,
			&a.Enabled, &a.LastFiredAt, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (r *alertRepo) getByID(id string) (*models.Alert, error) {
	a := &models.Alert{}
	err := r.db.QueryRow(`
		SELECT id, user_id, type, threshold, channel, enabled, last_fired_at, created_at
		FROM alerts WHERE id = ?`, id).
		Scan(&a.ID, &a.UserID, &a.Type, &a.Threshold, &a.Channel,
			&a.Enabled, &a.LastFiredAt, &a.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, repositories.ErrNotFound
	}
	return a, err
}

func (r *alertRepo) update(a *models.Alert) error {
	_, err := r.db.Exec(`
		UPDATE alerts SET threshold = ?, channel = ?, enabled = ? WHERE id = ?`,
		a.Threshold, a.Channel, a.Enabled, a.ID)
	return err
}

func (r *alertRepo) delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM alerts WHERE id = ?`, id)
	return err
}
