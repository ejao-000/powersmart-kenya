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

type MeterHandler struct {
	meterSvc      *services.MeterService
	predictionSvc *services.PredictionService
}

func NewMeterHandler(db *sql.DB) *MeterHandler {
	meterRepo := repositories.NewMeterRepo(db)
	return &MeterHandler{
		meterSvc:      services.NewMeterService(meterRepo),
		predictionSvc: services.NewPredictionService(meterRepo),
	}
}

// GetStatus GET /api/meter
func (h *MeterHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	meter, err := h.meterSvc.GetStatus(userID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Meter not found")
		return
	}
	utils.RespondJSON(w, http.StatusOK, meter)
}

// PostTelemetry POST /api/meter/telemetry
// Called by the frontend after reading units from the meter (BLE or manual entry).
func (h *MeterHandler) PostTelemetry(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var payload models.TelemetryPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := h.meterSvc.RecordReading(userID, payload.UnitsRemaining); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to record reading")
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "recorded"})
}

// GetPrediction GET /api/meter/prediction
func (h *MeterHandler) GetPrediction(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	meter, err := h.meterSvc.GetStatus(userID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "Meter not found")
		return
	}
	prediction, err := h.predictionSvc.Predict(meter)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Prediction failed")
		return
	}
	utils.RespondJSON(w, http.StatusOK, prediction)
}

// UpdateSettings PUT /api/meter/settings
func (h *MeterHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var settings models.MeterSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid settings payload")
		return
	}

	if err := h.meterSvc.UpdateSettings(userID, &settings); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to update settings")
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
