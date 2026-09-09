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

// BackupHandler exposes the backup power manager:
//
//	GET    /api/backup        — my backup sources
//	PUT    /api/backup        — add / update one source (per type)
//	DELETE /api/backup/{id}   — remove a source
type BackupHandler struct {
	svc *service.BackupService
}

func NewBackupHandler(db *sql.DB) *BackupHandler {
	return &BackupHandler{svc: service.NewBackupService(repositories.NewBackupRepo(db))}
}

func (h *BackupHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	list, err := h.svc.List(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, list)
}

func (h *BackupHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	var req model.UpsertBackupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondBadRequest(w, "request body is not valid JSON")
		return
	}
	src, err := h.svc.Upsert(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalid) {
			utils.RespondBadRequest(w, err.Error())
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondJSON(w, http.StatusOK, src)
}

func (h *BackupHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())
	id := r.PathValue("id")

	if err := h.svc.Delete(userID, id); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			utils.RespondNotFound(w, "backup source")
			return
		}
		utils.RespondInternalError(w)
		return
	}
	utils.RespondNoContent(w)
}
