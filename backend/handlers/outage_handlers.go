package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
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
