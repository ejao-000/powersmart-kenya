package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/powersmart/utils"
)

type contextKey string

const userIDKey contextKey = "userID"

// RequireAuth validates the Authorization: Bearer <token> header.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			utils.RespondError(w, http.StatusUnauthorized, "Missing or invalid authorization header")
			return
		}

		tokenStr := strings.TrimPrefix(auth, "Bearer ")
		claims, err := utils.ValidateJWT(tokenStr)
		if err != nil {
			utils.RespondError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserIDFromCtx extracts the authenticated user ID from the request context.
func UserIDFromCtx(ctx context.Context) string {
	if id, ok := ctx.Value(userIDKey).(string); ok {
		return id
	}
	return ""
}

// Chain composes multiple middleware into a single handler wrapper.
func Chain(middlewares ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}
