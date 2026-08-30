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

type MeterHandler struct {
	meterSvc      *service.MeterService
	predictionSvc *service.PredictionService
}

func NewMeterHandler(db *sql.DB) *MeterHandler {
	meterRepo := repositories.NewMeterRepo(db)
	return &MeterHandler{
		meterSvc:      service.NewMeterService(meterRepo),
		predictionSvc: service.NewPredictionService(meterRepo),
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

	var payload model.TelemetryPayload
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

	var settings model.MeterSettings
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

// ListMeters GET /api/meters — all meters for the account (tenant: 1, landlord: many).
func (h *MeterHandler) ListMeters(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	meters, err := h.meterSvc.ListMeters(userID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch meters")
		return
	}
	utils.RespondJSON(w, http.StatusOK, meters)
}

// AddMeter POST /api/meters — register an additional meter (landlord / multi-unit owner).
func (h *MeterHandler) AddMeter(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.AddMeterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	meter, err := h.meterSvc.AddMeter(userID, &req)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusCreated, meter)
}

// UpdateMeterSettings PUT /api/meters/{id}/settings — per-meter auto top-up config.
func (h *MeterHandler) UpdateMeterSettings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	meterID := r.PathValue("id")

	var settings model.MeterSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid settings payload")
		return
	}

	if err := h.meterSvc.UpdateMeterSettings(meterID, userID, &settings); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
