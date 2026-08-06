package middleware

import (
	"net/http"
	"os"
)

// SecurityHeaders adds hardened HTTP security headers to every response.
// It is applied as one of the outermost middleware so all routes — including
// static assets and error responses — are protected.
func SecurityHeaders(next http.Handler) http.Handler {
	isProd := os.Getenv("APP_ENV") == "production"

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()

		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Cross-Origin-Resource-Policy", "same-origin")

		// Content-Security-Policy tuned to what the portal actually loads:
		// self + Google Fonts only. Everything else (scripts, frames, media)
		// is blocked unless explicitly allowed below.
		h.Set("Content-Security-Policy",
			"default-src 'none'; "+
				"script-src 'self' 'unsafe-inline'; "+
				"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
				"font-src 'self' https://fonts.gstatic.com; "+
				"img-src 'self' data:; "+
				"connect-src 'self'; "+
				"base-uri 'self'; "+
				"form-action 'self'; "+
				"object-src 'none'; "+
				"frame-ancestors 'none'")

		if isProd {
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		}

		next.ServeHTTP(w, r)
	})
}
