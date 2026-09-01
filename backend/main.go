package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"powersmart-backend/config"
	"powersmart-backend/handlers"
	"powersmart-backend/middleware"
	"powersmart-backend/model"
	"powersmart-backend/utils"
)

// MessageResponse is the JSON shape returned by the health endpoint.
type MessageResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func main() {
	// Load environment + validate required production config BEFORE serving, so
	// a missing JWT_SECRET fails the deploy immediately with a clear message
	// instead of crash-looping at the first login/register.
	config.LoadEnv()
	if err := utils.ValidateProductionConfig(); err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	// Connect database
	db := config.ConnectDB()
	config.RunMigrations(db)
	config.SeedAdminIfConfigured(db)

	// Wire up handlers (dependency injection: pass db → repo → service → handler)
	authH := handlers.NewAuthHandler(db)
	meterH := handlers.NewMeterHandler(db)
	tokenH := handlers.NewTokenHandler(db)
	paymentH := handlers.NewPaymentHandler(db)
	alertH := handlers.NewAlertHandler(db)
	adminH := handlers.NewAdminHandler(db)
	txH := handlers.NewTransactionHandler(db)
	outageH := handlers.NewOutageHandler(db)
	usageH := handlers.NewUsageHandler(db)

	mux := http.NewServeMux()

	// ── API Routes ─────────────────────────────────────────────────────────

	// Public API routes — auth endpoints get a stricter rate limiter to slow
	// brute-force attempts.
	authLimited := middleware.RateLimitAuth
	mux.Handle("POST /api/auth/register", authLimited(http.HandlerFunc(authH.Register)))
	mux.Handle("POST /api/auth/login", authLimited(http.HandlerFunc(authH.Login)))
	mux.Handle("POST /api/auth/admin-login", authLimited(http.HandlerFunc(authH.AdminLogin)))

	// Health check endpoint
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(MessageResponse{
			Status:  "success",
			Message: "Backend is running",
		})
	})

	// Protected routes (JWT middleware applied per-group)
	protected := middleware.Chain(
		middleware.RequireAuth,
		middleware.RateLimit,
	)

	// Admin-only routes (JWT + role check)
	adminOnly := middleware.Chain(
		middleware.RequireAuth,
		middleware.RequireRole(model.RoleAdmin),
		middleware.RateLimit,
	)

	// Auth
	mux.Handle("GET /api/auth/me", protected(http.HandlerFunc(authH.Me)))
	mux.Handle("POST /api/auth/logout", protected(http.HandlerFunc(authH.Logout)))

	// Admin
	mux.Handle("GET /api/admin/stats", adminOnly(http.HandlerFunc(adminH.Stats)))
	mux.Handle("GET /api/admin/users", adminOnly(http.HandlerFunc(adminH.Users)))
	mux.Handle("GET /api/admin/meters", adminOnly(http.HandlerFunc(adminH.Meters)))
	mux.Handle("GET /api/admin/tokens", adminOnly(http.HandlerFunc(adminH.Tokens)))
	mux.Handle("GET /api/admin/transactions", adminOnly(http.HandlerFunc(adminH.Transactions)))

	// Meter
	mux.Handle("GET /api/meter", protected(http.HandlerFunc(meterH.GetStatus)))
	mux.Handle("POST /api/meter/telemetry", protected(http.HandlerFunc(meterH.PostTelemetry)))
	mux.Handle("GET /api/meter/prediction", protected(http.HandlerFunc(meterH.GetPrediction)))
	mux.Handle("GET /api/meter/usage", protected(http.HandlerFunc(usageH.Summary)))
	mux.Handle("PUT /api/meter/settings", protected(http.HandlerFunc(meterH.UpdateSettings)))

	// Multi-meter (landlord / multi-unit owners)
	mux.Handle("GET /api/meters", protected(http.HandlerFunc(meterH.ListMeters)))
	mux.Handle("POST /api/meters", protected(http.HandlerFunc(meterH.AddMeter)))
	mux.Handle("PUT /api/meters/{id}/settings", protected(http.HandlerFunc(meterH.UpdateMeterSettings)))

	// Tokens
	mux.Handle("GET /api/tokens", protected(http.HandlerFunc(tokenH.ListHistory)))
	mux.Handle("POST /api/tokens/buy", protected(http.HandlerFunc(tokenH.BuyToken)))
	mux.Handle("POST /api/tokens/transfer", protected(http.HandlerFunc(tokenH.Transfer)))
	mux.Handle("POST /api/tokens/{id}/push-bluetooth", protected(http.HandlerFunc(tokenH.PushViaBluetooth)))
	mux.Handle("DELETE /api/tokens/{id}", protected(http.HandlerFunc(tokenH.DeleteFromHistory)))

	// Payments
	mux.Handle("POST /api/payments/mpesa/initiate", protected(http.HandlerFunc(paymentH.InitiateMpesa)))
	mux.Handle("POST /api/payments/airtel/initiate", protected(http.HandlerFunc(paymentH.InitiateAirtel)))
	mux.Handle("POST /api/payments/bank/initiate", protected(http.HandlerFunc(paymentH.InitiateBank)))
	mux.Handle("POST /api/payments/mpesa/callback", middleware.WebhookSecretAuth("MPESA_CALLBACK_SECRET")(http.HandlerFunc(paymentH.MpesaCallback)))
	mux.Handle("POST /api/payments/airtel/callback", middleware.WebhookSecretAuth("AIRTEL_CALLBACK_SECRET")(http.HandlerFunc(paymentH.AirtelCallback)))

	// Alerts
	mux.Handle("GET /api/alerts", protected(http.HandlerFunc(alertH.List)))
	mux.Handle("POST /api/alerts", protected(http.HandlerFunc(alertH.Create)))
	mux.Handle("PUT /api/alerts/{id}", protected(http.HandlerFunc(alertH.Update)))
	mux.Handle("DELETE /api/alerts/{id}", protected(http.HandlerFunc(alertH.Delete)))

	// Transactions
	mux.Handle("GET /api/transactions", protected(http.HandlerFunc(txH.ListHistory)))

	// Outages (community power-outage reports + map)
	mux.Handle("GET /api/outages", protected(http.HandlerFunc(outageH.List)))
	mux.Handle("POST /api/outages", protected(http.HandlerFunc(outageH.Report)))

	// Unknown /api paths get a JSON 404 (this mux only matches registered /api
	// routes; a handler for "/" is intentionally NOT registered so the server
	// is a pure API backend and never serves the frontend).
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "endpoint not found"})
	})

	// ── Server Configuration ───────────────────────────────────────────────

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Apply security headers + CORS middleware to all routes (outermost first).
	// The frontend is served separately (e.g. Vite dev server) and talks to
	// this API via HTTP; allow its origin in CORS_ALLOWED_ORIGINS in production.
	handler := middleware.CORS(middleware.SecurityHeaders(mux))

	logRoutes()

	log.Printf("PowerSmart API listening on :%s", port)
	log.Printf("API base URL: http://localhost:%s/api", port)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

// logRoutes prints all registered routes for debugging.
func logRoutes() {
	log.Println("Registered routes:")
	log.Println("  POST /api/auth/register")
	log.Println("  POST /api/auth/login")
	log.Println("  POST /api/auth/admin-login")
	log.Println("  GET  /api/health")
	log.Println("  GET  /api/auth/me")
	log.Println("  POST /api/auth/logout")
	log.Println("  GET  /api/admin/stats")
	log.Println("  GET  /api/admin/users")
	log.Println("  GET  /api/admin/meters")
	log.Println("  GET  /api/admin/tokens")
	log.Println("  GET  /api/admin/transactions")
	log.Println("  GET  /api/meter")
	log.Println("  POST /api/meter/telemetry")
	log.Println("  GET  /api/meter/prediction")
	log.Println("  GET  /api/meter/usage")
	log.Println("  PUT  /api/meter/settings")
	log.Println("  GET  /api/meters")
	log.Println("  POST /api/meters")
	log.Println("  PUT  /api/meters/{id}/settings")
	log.Println("  GET  /api/tokens")
	log.Println("  POST /api/tokens/buy")
	log.Println("  POST /api/tokens/transfer")
	log.Println("  POST /api/tokens/{id}/push-bluetooth")
	log.Println("  DELETE /api/tokens/{id}")
	log.Println("  POST /api/payments/mpesa/initiate")
	log.Println("  POST /api/payments/airtel/initiate")
	log.Println("  POST /api/payments/bank/initiate")
	log.Println("  POST /api/payments/mpesa/callback")
	log.Println("  POST /api/payments/airtel/callback")
	log.Println("  GET  /api/alerts")
	log.Println("  POST /api/alerts")
	log.Println("  PUT  /api/alerts/{id}")
	log.Println("  DELETE /api/alerts/{id}")
	log.Println("  GET  /api/transactions")
	log.Println("  GET  /api/outages")
	log.Println("  POST /api/outages")
	log.Println("  (API-only — the frontend is served separately)")
}
