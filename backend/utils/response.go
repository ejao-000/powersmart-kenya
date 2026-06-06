package utils

import (
	"encoding/json"
	"log"
	"net/http"
)

// ── Standard envelope types ──────────────────────────────────────────────────

// SuccessResponse wraps any successful payload with a consistent shape.
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// PaginatedResponse wraps a list payload with pagination metadata.
type PaginatedResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Total   int         `json:"total"`
	Page    int         `json:"page"`
	Limit   int         `json:"limit"`
}

// ── Core writers ─────────────────────────────────────────────────────────────

// RespondJSON serialises payload as JSON and writes it with the given status code.
// All other respond helpers call this one.
func RespondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[response] encode error: %v", err)
	}
}

// RespondError writes a uniform {"error": "..."} JSON body.
func RespondError(w http.ResponseWriter, status int, message string) {
	RespondJSON(w, status, ErrorResponse{Error: message})
}

// RespondSuccess wraps data in the standard success envelope.
func RespondSuccess(w http.ResponseWriter, status int, data interface{}) {
	RespondJSON(w, status, SuccessResponse{Success: true, Data: data})
}

// RespondMessage writes a success response with only a message string (no data body).
func RespondMessage(w http.ResponseWriter, status int, message string) {
	RespondJSON(w, status, SuccessResponse{Success: true, Message: message})
}

// RespondPaginated writes a list result with pagination metadata.
func RespondPaginated(w http.ResponseWriter, data interface{}, total, page, limit int) {
	RespondJSON(w, http.StatusOK, PaginatedResponse{
		Success: true,
		Data:    data,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// RespondNoContent writes a 204 with no body (used for DELETE responses).
func RespondNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// ── Semantic shortcuts ────────────────────────────────────────────────────────

func RespondBadRequest(w http.ResponseWriter, message string) {
	RespondError(w, http.StatusBadRequest, message)
}

func RespondUnauthorized(w http.ResponseWriter, message string) {
	RespondError(w, http.StatusUnauthorized, message)
}

func RespondForbidden(w http.ResponseWriter, message string) {
	RespondError(w, http.StatusForbidden, message)
}

func RespondNotFound(w http.ResponseWriter, resource string) {
	RespondError(w, http.StatusNotFound, resource+" not found")
}

func RespondConflict(w http.ResponseWriter, message string) {
	RespondError(w, http.StatusConflict, message)
}

func RespondInternalError(w http.ResponseWriter) {
	RespondError(w, http.StatusInternalServerError, "an internal server error occurred")
}

func RespondUnprocessable(w http.ResponseWriter, message string) {
	RespondError(w, http.StatusUnprocessableEntity, message)
}

func RespondTooManyRequests(w http.ResponseWriter) {
	RespondError(w, http.StatusTooManyRequests, "too many requests — please slow down")
}