package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/middleware"
	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/utils"
)

type OutageHandler struct {
	db   *sql.DB
	repo *repositories.OutageRepo
}

func NewOutageHandler(db *sql.DB) *OutageHandler {
	return &OutageHandler{db: db, repo: repositories.NewOutageRepo(db)}
}

// List GET /api/outages — recent outage reports for the area map.
func (h *OutageHandler) List(w http.ResponseWriter, r *http.Request) {
	outages, err := h.repo.ListRecent(100)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	if outages == nil {
		outages = []*model.Outage{}
	}
	utils.RespondJSON(w, http.StatusOK, outages)
}

// Report POST /api/outages — create a new outage report.
func (h *OutageHandler) Report(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.ReportOutageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "Invalid request body")
		return
	}
	if req.Area == "" {
		utils.RespondBadRequest(w, "Area is required")
		return
	}
	if math.IsNaN(req.Latitude) || math.IsNaN(req.Longitude) ||
		req.Latitude < -90 || req.Latitude > 90 ||
		req.Longitude < -180 || req.Longitude > 180 {
		utils.RespondBadRequest(w, "Valid latitude/longitude coordinates are required")
		return
	}

	reporter := ""
	_ = h.db.QueryRow(`SELECT name FROM users WHERE id = $1`, userID).Scan(&reporter)

	outage := &model.Outage{
		ID:           uuid.NewString(),
		UserID:       userID,
		ReporterName: reporter,
		Area:         req.Area,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		Description:  req.Description,
		Status:       model.OutageReported,
		CreatedAt:    time.Now(),
	}
	if err := h.repo.Create(outage); err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusCreated, outage)
}

// Risk GET /api/outages/risk — estimates the chance of an outage in the user's
// neighbourhood from recent community reports near it.
func (h *OutageHandler) Risk(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	hood := ""
	_ = h.db.QueryRow(`SELECT COALESCE(neighborhood, '') FROM users WHERE id = $1`, userID).Scan(&hood)

	recent, err := h.repo.ListRecent(100)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}

	risk := &model.OutageRisk{RiskPct: 8, Level: "low", Reasons: []string{}, Tips: []string{}}

	if hood == "" {
		risk.Reasons = append(risk.Reasons, "Tell us your neighborhood in Savings Hub to personalise this.")
		risk.Tips = []string{"Keep a charged power bank and torch handy.", "Subscribe to low-balance alerts so you never run out before an outage."}
		utils.RespondJSON(w, http.StatusOK, risk)
		return
	}

	now := time.Now()
	matches := []*model.Outage{}
	for _, o := range recent {
		area := strings.ToLower(strings.TrimSpace(o.Area))
		hoodLow := strings.ToLower(strings.TrimSpace(hood))
		if area == "" || hoodLow == "" {
			continue
		}
		if strings.Contains(area, hoodLow) || strings.Contains(hoodLow, area) {
			matches = append(matches, o)
		}
	}

	score := 8.0
	active := 0
	for _, o := range matches {
		if now.Sub(o.CreatedAt) <= 7*24*time.Hour {
			score += 10
		}
		if o.Status != "resolved" && now.Sub(o.CreatedAt) <= 48*time.Hour {
			active++
		}
	}
	score += float64(active * 8)
	if score > 95 {
		score = 95
	}

	risk.RiskPct = int(math.Round(score))
	switch {
	case risk.RiskPct >= 75:
		risk.Level = "very_high"
	case risk.RiskPct >= 55:
		risk.Level = "high"
	case risk.RiskPct >= 30:
		risk.Level = "moderate"
	default:
		risk.Level = "low"
	}

	if len(matches) == 0 {
		risk.Reasons = append(risk.Reasons, "No recent outage reports near "+hood+".")
	} else {
		risk.Reasons = append(risk.Reasons, fmt.Sprintf("%d outage report(s) near %s in the last week.", len(matches), hood))
		if active > 0 {
			risk.Reasons = append(risk.Reasons, fmt.Sprintf("%d active report(s) within 48 hours — treat this as a live risk.", active))
		}
	}
	risk.Tips = []string{
		"Charge phones and power banks now.",
		"If you have a backup source, top it up and plan which appliances to keep on.",
		"Keep your token balance healthy so you are not caught out after restoration.",
	}
	utils.RespondJSON(w, http.StatusOK, risk)
}
