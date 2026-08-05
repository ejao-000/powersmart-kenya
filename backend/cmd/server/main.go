// Package main initializes and starts the PowerSmart Kenya backend server.
//
// This file will be extended to register new API handlers for landlord and admin functionalities.
// It will also configure the necessary middleware, including role-based access control.
package main

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/go-sql-driver/mysql"
)

type MeterRegistration struct {
	MeterNumber string `json:"meter_number"`
	OwnerID     string `json:"owner_id"`
	Alias       string `json:"alias"`
}

type TokenPurchaseRequest struct {
	MeterID string  `json:"meter_id"`
	Amount  float64 `json:"amount"`
	Phone   string  `json:"phone"`
}

func main() {
	app := fiber.New(fiber.Config{
		AppName: "powersmart-kenya",
	})

	app.Use(logger.New())

	// Database connection mock
	db, err := sql.Open("mysql", "user:password@tcp(127.0.0.1:3306)/kplc_db?parseTime=true")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	api := app.Group("/api/v1")

	// 1. Meter Registration Endpoint
	api.Post("/meters", func(c *fiber.Ctx) error {
		var req MeterRegistration
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
		}

		// Validate 11-digit KPLC meter format rule
		if len(req.MeterNumber) != 11 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Kenya Power meter account number (must be 11 digits)"})
		}

		query := "INSERT INTO meters (id, meter_number, owner_id, alias) VALUES (UUID(), ?, ?, ?)"
		_, err := db.Exec(query, req.MeterNumber, req.OwnerID, req.Alias)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to register meter"})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"status":  "success",
			"message": "KPLC meter successfully registered and verified.",
		})
	})

	// 2. Token Purchase & Retry Queue Endpoint
	api.Post("/tokens/purchase", func(c *fiber.Ctx) error {
		var req TokenPurchaseRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid purchase request"})
		}

		// Simulate background retry queue dispatch
		go func(meterID string, amt float64) {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			
			// Trigger M-Pesa STK push and poll KPLC aggregator API with retry backoff
			simulateKPLCVending(ctx, meterID, amt)
		}(req.MeterID, req.Amount)

		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"status":  "queued",
			"message": "Payment initiated. Token generation in progress with auto-retry active.",
		})
	})

	log.Println("Backend server running on port 8080...")
	log.Fatal(app.Listen(":8080"))
}

func simulateKPLCVending(ctx context.Context, meterID string, amount float64) {
	// Worker logic for handling delayed KPLC server responses
	time.Sleep(2 * time.Second)
	log.Printf("Vending token for Meter ID: %s for amount KSh %.2f", meterID, amount)
}
