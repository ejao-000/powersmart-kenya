package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
)

// allowedOrigins is the set of origins that may call the API.
// Populate CORS_ALLOWED_ORIGINS in .env as a comma-separated list.
// Defaults to "*" in development when the env var is absent.
//
// It is loaded lazily on first request (not at package init) so that
// config.LoadEnv() has already run and any CORS_ALLOWED_ORIGINS from .env
// is honored.
var (
	allowedOrigins    map[string]bool
	allowedOriginsOne sync.Once
)

func loadAllowedOrigins() map[string]bool {
	allowedOriginsOne.Do(func() {
		allowedOrigins = parseAllowedOrigins()
	})
	return allowedOrigins
}

func parseAllowedOrigins() map[string]bool {
	raw := os.Getenv("CORS_ALLOWED_ORIGINS")
	set := make(map[string]bool)
	if raw == "" {
		return set // empty → wildcard mode
	}
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			set[o] = true
		}
	}
	return set
}

// isAllowed returns true when the request origin is permitted.
func isAllowed(origin string) bool {
	origins := loadAllowedOrigins()
	if len(origins) == 0 {
		return true // wildcard / development mode
	}
	return origins[origin]
}

// CORS adds cross-origin resource sharing headers to every response and handles
// pre-flight OPTIONS requests. It is applied as the outermost middleware so all
// routes — including error responses — carry the correct headers.
//
//   Production .env example:
//     CORS_ALLOWED_ORIGINS=https://powersmart.co.ke,https://app.powersmart.co.ke
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" {
			if isAllowed(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				// Vary: Origin tells caches not to serve the same response to
				// different origins.
				w.Header().Add("Vary", "Origin")
			} else {
				log.Printf("[cors] blocked origin: %s", origin)
				http.Error(w, "origin not allowed", http.StatusForbidden)
				return
			}
		} else if len(loadAllowedOrigins()) == 0 {
			// Non-browser / same-origin requests in dev: allow all
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
		w.Header().Set("Access-Control-Max-Age", "86400") // 24 h pre-flight cache

		// Short-circuit pre-flight; no body needed
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
