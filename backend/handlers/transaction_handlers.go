package handlers

import (
	"database/sql"
	"net/http"

	"powersmart-backend/middleware"
	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/utils"
)

// TransactionHandler exposes payment transaction history.
type TransactionHandler struct {
	txRepo *repositories.TransactionRepo
}

func NewTransactionHandler(db *sql.DB) *TransactionHandler {
	return &TransactionHandler{txRepo: repositories.NewTransactionRepo(db)}
}

// ListHistory GET /api/transactions  [protected]
//
// Returns all payment transactions for the authenticated user, newest first.
func (h *TransactionHandler) ListHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromCtx(r.Context())

	txns, err := h.txRepo.ListByUser(userID)
	if err != nil {
		utils.RespondInternalError(w)
		return
	}
	if txns == nil {
		txns = []*model.Transaction{} // return [] not null
	}

	utils.RespondJSON(w, http.StatusOK, txns)
}
