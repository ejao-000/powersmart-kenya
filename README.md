# PowerSmart — Kenya Power Smart Meter Platform

A full-stack web platform for Kenya Power prepaid meter users. Buy tokens, auto-push them via Bluetooth, forecast usage, set alerts, and manage power intelligently.

---

## Features

- **Kenya Power account registration** — only valid KP meter account numbers allowed
- **Buy power tokens** via M-Pesa / Airtel Money / bank payment
- **Bluetooth auto-push** — token delivered to your meter box automatically when Bluetooth is on
- **Token history** — full purchase history (user-deletable)
- **Usage prediction** — AI-style forecast of when power will run out
- **Power management** — track consumption, set daily/weekly budgets
- **Smart alerts** — configurable notification thresholds before power runs out

---

## Project Structure

```
powersmart-project/
│
├── powersmart-frontend/
│   ├── index.html                   # Sign-in / Sign-up gateway
│   ├── dashboard.html               # Main dashboard shell
│   │
│   ├── pages/
│   │   ├── history.html             # Token purchase history
│   │   ├── tokens.html              # Buy tokens + payment flow
│   │   ├── alerts.html              # Notification threshold settings
│   │   └── settings.html            # Account + meter settings
│   │
│   ├── css/
│   │   ├── main.css                 # Design tokens, variables, reset
│   │   ├── auth.css                 # Registration / login styles
│   │   ├── dashboard.css            # Metrics, ring gauges, layout
│   │   ├── tokens.css               # Token purchase + payment panel
│   │   └── alerts.css               # Alert settings panel
│   │
│   └── js/
│       ├── store.js                 # Global state + theme persistence
│       ├── api.js                   # Centralised HTTP client (all fetch calls)
│       ├── auth.js                  # Register / login / logout logic
│       ├── dashboard.js             # Dashboard view routing + live metrics
│       ├── tokens.js                # Token purchase + history display
│       ├── bluetooth.js             # Web Bluetooth API — auto meter push
│       ├── predictor.js             # Client-side usage prediction engine
│       ├── notifications.js         # Push notification + threshold alerts
│       └── settings.js              # Account / alert settings management
│
└── powersmart-backend/
    ├── main.go                      # Server entrypoint + route registration
    ├── go.mod
    ├── go.sum
    │
    ├── config/
    │   ├── database.go              # DB connection (SQLite dev / MySQL prod)
    │   └── env.go                   # Environment config loader
    │
    ├── middleware/
    │   ├── auth.go                  # JWT validation middleware
    │   ├── cors.go                  # CORS headers
    │   └── rate_limit.go            # Per-IP rate limiting
    │
    ├── models/
    │   ├── user.go                  # User + KP account schema
    │   ├── meter.go                 # Meter telemetry + settings
    │   ├── token.go                 # Power token purchase record
    │   ├── transaction.go           # M-Pesa / Airtel / bank payment
    │   └── alert.go                 # Threshold alert configuration
    │
    ├── handlers/                    # HTTP layer — parse request, call service, write response
    │   ├── auth_handler.go
    │   ├── meter_handler.go
    │   ├── token_handler.go
    │   ├── payment_handler.go
    │   └── alert_handler.go
    │
    ├── services/                    # Business logic — orchestrates repos + external calls
    │   ├── auth_service.go          # Registration (KP account validation), JWT issuance
    │   ├── meter_service.go         # Telemetry ingestion, decay engine, auto top-up
    │   ├── token_service.go         # Token purchase flow, history, deletion
    │   ├── payment_service.go       # M-Pesa / Airtel / bank gateway orchestration
    │   ├── prediction_service.go    # Usage rate analysis + depletion forecast
    │   └── bluetooth_service.go     # Token push command (BLE GATT write)
    │
    ├── repositories/                # Data access layer — all SQL lives here
    │   ├── user_repo.go
    │   ├── meter_repo.go
    │   ├── token_repo.go
    │   └── transaction_repo.go
    │
    └── utils/
        ├── jwt.go                   # Token generation / validation helpers
        ├── kp_validator.go          # Kenya Power account number format check
        └── response.go              # Standard JSON response helpers
```

---

## Architecture Layers

| Layer | Responsibility |
|---|---|
| **Handler** | HTTP parsing, input validation, response serialization |
| **Service** | Business rules, orchestration, external API calls |
| **Repository** | Database CRUD — the only place SQL is written |
| **Model** | Shared domain types used across all layers |
| **Utils** | Stateless helpers with no business logic |

---

## Running Locally

```bash
# Backend
cd powersmart-backend
go mod tidy
go run main.go

# Frontend — serve with any static server
cd powersmart-frontend
npx serve .
```

---

## Environment Variables

```env
DB_DRIVER=sqlite
DB_DSN=./powersmart.db
JWT_SECRET=change_me_in_production
PORT=8080
KP_API_URL=https://api.kplc.co.ke   # Kenya Power account validation endpoint
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
AIRTEL_API_KEY=...
```