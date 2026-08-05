// Package middleware provides shared HTTP middleware functions.
//
// This file will be extended to include role-based access control (RBAC) middleware
// that verifies a user's role (tenant, landlord, admin) from their JWT claims
// before allowing access to specific API endpoints.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"powersmart-backend/model"
	"powersmart-backend/utils"
)

type contextKey string

const (
	userIDKey contextKey = "userID"
	userRoleKey contextKey = "userRole"
)

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
		ctx = context.WithValue(ctx, userRoleKey, claims.Role)
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

// UserRoleFromCtx extracts the authenticated user role from the request context.
func UserRoleFromCtx(ctx context.Context) model.UserRole {
	if role, ok := ctx.Value(userRoleKey).(model.UserRole); ok {
		return role
	}
	return ""
}

// RequireRole is a middleware that restricts access to handlers based on user roles.
func RequireRole(allowedRoles ...model.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole := UserRoleFromCtx(r.Context())
			if userRole == "" {
				utils.RespondUnauthorized(w, "User role not found in context")
				return
			}

			isAllowed := false
			for _, role := range allowedRoles {
				if userRole == role {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				utils.RespondForbidden(w, "Access denied: insufficient role")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
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
