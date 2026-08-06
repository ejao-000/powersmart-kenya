package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"powersmart-backend/config"
	"powersmart-backend/handlers"
	"powersmart-backend/middleware"
	"powersmart-backend/model"
)

// Response structure for the API
type MessageResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// SpaFileServer serves SPA files with fallback to index.html
type SpaFileServer struct {
	fs        http.FileSystem
	indexFile string
}

func (sfs *SpaFileServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Resolve and sanitise the requested path
	path := r.URL.Path
	if path == "/" {
		path = "/index.html"
	}
	cleaned := strings.TrimPrefix(path, "/")

	// Refuse path traversal attempts
	if strings.Contains(cleaned, "..") {
		http.NotFound(w, r)
		return
	}

	// Try to open the file
	f, err := sfs.fs.Open(cleaned)
	if err == nil {
		f.Close()
		http.FileServer(sfs.fs).ServeHTTP(w, r)
		return
	}

	// File doesn't exist, serve index.html (for client-side routing)
	indexFile, err := sfs.fs.Open(sfs.indexFile)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer indexFile.Close()

	// Serve index.html
	stat, _ := indexFile.Stat()
	http.ServeContent(w, r, sfs.indexFile, stat.ModTime(), indexFile)
}

func main() {
	// Load environment + connect database
	config.LoadEnv()
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
	mux.Handle("PUT /api/meter/settings", protected(http.HandlerFunc(meterH.UpdateSettings)))

	// Tokens
	mux.Handle("GET /api/tokens", protected(http.HandlerFunc(tokenH.ListHistory)))
	mux.Handle("POST /api/tokens/buy", protected(http.HandlerFunc(tokenH.BuyToken)))
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

	// ── Frontend Static File Serving ──────────────────────────────────────

	// Determine the frontend directory (supports multiple common paths)
	frontendDir := getFrontendDirectory()
	log.Printf("Serving frontend from: %s", frontendDir)

	// Create a file server for the frontend directory
	fs := http.Dir(frontendDir)

	// Serve static files with SPA support
	spaHandler := &SpaFileServer{
		fs:        fs,
		indexFile: "index.html",
	}

	// Serve all non-API routes with the SPA handler
	mux.Handle("/", spaHandler)

	// ── Server Configuration ───────────────────────────────────────────────

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Apply security headers + CORS middleware to all routes (outermost first)
	handler := middleware.CORS(middleware.SecurityHeaders(mux))

	// Log all registered routes for debugging
	logRoutes(mux)

	log.Printf("PowerSmart API listening on :%s", port)
	log.Printf("Frontend available at http://localhost:%s", port)

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

// getFrontendDirectory attempts to find the frontend directory
func getFrontendDirectory() string {
	// Check common locations for frontend files
	possiblePaths := []string{
		"./frontend",           // Default: frontend folder in current directory
		"./static",             // Alternative: static folder
		"../frontend",          // One level up (for cmd/server structure)
		"./public",             // Alternative: public folder
		"./frontend/dist",      // For built frontend (Vite/React build output)
		"./dist",               // Common build output directory
	}

	// Check if FRONTEND_DIR environment variable is set
	if envDir := os.Getenv("FRONTEND_DIR"); envDir != "" {
		possiblePaths = append([]string{envDir}, possiblePaths...)
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			// Check if index.html exists in this directory
			indexPath := filepath.Join(path, "index.html")
			if _, err := os.Stat(indexPath); err == nil {
				return path
			}
		}
	}

	// Default fallback - create frontend directory if it doesn't exist
	os.MkdirAll("./frontend", 0755)
	return "./frontend"
}

// logRoutes prints all registered routes for debugging
func logRoutes(mux *http.ServeMux) {
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
	log.Println("  PUT  /api/meter/settings")
	log.Println("  GET  /api/tokens")
	log.Println("  POST /api/tokens/buy")
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
	log.Println("  /*   (SPA frontend)")
}
