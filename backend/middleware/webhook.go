package middleware

import (
	"crypto/subtle"
	"net/http"
	"os"

	"powersmart-backend/utils"
)

// WebhookSecretAuth protects public provider-callback endpoints (M-Pesa,
// Airtel) with a shared secret. The secret is sent by the provider (or your
// proxy) in the X-Webhook-Secret header.
//
// If the corresponding env var is empty (development), the middleware passes
// requests through unchanged so callbacks can be tested. In production, set:
//   MPESA_CALLBACK_SECRET  and/or  AIRTEL_CALLBACK_SECRET
func WebhookSecretAuth(secretEnv string) func(http.Handler) http.Handler {
	secret := os.Getenv(secretEnv)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// No secret configured → allow (dev mode).
			if secret == "" {
				next.ServeHTTP(w, r)
				return
			}

			provided := r.Header.Get("X-Webhook-Secret")
			if subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
				utils.RespondUnauthorized(w, "invalid webhook secret")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
