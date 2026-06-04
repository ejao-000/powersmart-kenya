package main

import (
	"log"
	"net/http"
	"os"

	"github.com/powersmart/config"
	"github.com/powersmart/handlers"
	"github.com/powersmart/middleware"
)

func main() {
	// Load environment + connect database
	config.LoadEnv()
	db := config.ConnectDB()
	config.RunMigrations(db)

	// Wire up handlers (dependency injection: pass db → repo → service → handler)
	authH := handlers.NewAuthHandler(db)
	meterH := handlers.NewMeterHandler(db)
	tokenH := handlers.NewTokenHandler(db)
	paymentH := handlers.NewPaymentHandler(db)
	alertH := handlers.NewAlertHandler(db)

	mux := http.NewServeMux()

	// ── Public routes ──────────────────────────────────────────────────
	mux.HandleFunc("POST /api/auth/register", authH.Register)
	mux.HandleFunc("POST /api/auth/login", authH.Login)

	// ── Protected routes (JWT middleware applied per-group) ────────────
	protected := middleware.Chain(
		middleware.RequireAuth,
		middleware.RateLimit,
	)

	// Auth
	mux.Handle("GET /api/auth/me", protected(http.HandlerFunc(authH.Me)))
	mux.Handle("POST /api/auth/logout", protected(http.HandlerFunc(authH.Logout)))

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
	mux.HandleFunc("POST /api/payments/mpesa/callback", paymentH.MpesaCallback)   // Safaricom calls this
	mux.HandleFunc("POST /api/payments/airtel/callback", paymentH.AirtelCallback)

	// Alerts
	mux.Handle("GET /api/alerts", protected(http.HandlerFunc(alertH.List)))
	mux.Handle("POST /api/alerts", protected(http.HandlerFunc(alertH.Create)))
	mux.Handle("PUT /api/alerts/{id}", protected(http.HandlerFunc(alertH.Update)))
	mux.Handle("DELETE /api/alerts/{id}", protected(http.HandlerFunc(alertH.Delete)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	handler := middleware.CORS(mux)

	log.Printf("PowerSmart API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
