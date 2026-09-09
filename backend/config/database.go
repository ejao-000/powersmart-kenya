package config

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/stdlib"
)

func init() {
	// The pgx driver registers itself as "pgx" / "pgx/v5". Alias it under the
	// conventional "postgres" name so DB_DRIVER=postgres works out of the box.
	sql.Register("postgres", stdlib.GetDefaultDriver())
}

// ConnectDB opens a PostgreSQL connection pool.
//
// Configuration (in order of precedence):
//   - DATABASE_URL (Render / Heroku style full connection string, if set)
//   - DB_DSN environment variable
//   - default: postgres://postgres:postgres@localhost:5432/powersmart?sslmode=disable
func ConnectDB() *sql.DB {
	driver := Getenv("DB_DRIVER", "postgres")
	dsn := Getenv("DB_DSN", "postgres://postgres:postgres@localhost:5432/powersmart?sslmode=disable")

	// DATABASE_URL overrides DB_DSN when present (common on managed hosts).
	if v := os.Getenv("DATABASE_URL"); v != "" {
		dsn = v
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}

	// Sensible pool settings for a single web service.
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err = db.Ping(); err != nil {
		log.Fatalf("DB ping error: %v", err)
	}
	log.Printf("Connected to %s database", driver)
	return db
}

// RunMigrations creates all tables if they do not exist.
// Uses PostgreSQL data types (TIMESTAMPTZ, DOUBLE PRECISION, BOOLEAN).
func RunMigrations(db *sql.DB) {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id            TEXT PRIMARY KEY,
			name          TEXT NOT NULL,
			email         TEXT UNIQUE NOT NULL,
			phone         TEXT NOT NULL,
			password      TEXT NOT NULL,
			meter_account TEXT UNIQUE NOT NULL,
			meter_number  TEXT UNIQUE NOT NULL,
			role          TEXT NOT NULL DEFAULT 'tenant',
			created_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS meters (
			id              TEXT PRIMARY KEY,
			user_id         TEXT NOT NULL REFERENCES users(id),
			landlord_id     TEXT REFERENCES users(id),
			meter_number    TEXT,
			units_remaining DOUBLE PRECISION NOT NULL DEFAULT 0,
			daily_avg_units DOUBLE PRECISION NOT NULL DEFAULT 0,
			last_reading_at TIMESTAMPTZ,
			auto_topup      BOOLEAN NOT NULL DEFAULT FALSE,
			topup_threshold DOUBLE PRECISION NOT NULL DEFAULT 5,
			topup_amount    INTEGER NOT NULL DEFAULT 200,
			updated_at      TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS usage_history (
			id              TEXT PRIMARY KEY,
			meter_id        TEXT NOT NULL REFERENCES meters(id),
			units_remaining DOUBLE PRECISION NOT NULL,
			recorded_at     TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS tokens (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			meter_id      TEXT NOT NULL REFERENCES meters(id),
			token_number  TEXT NOT NULL,
			units         DOUBLE PRECISION NOT NULL,
			amount_ksh    INTEGER NOT NULL,
			payment_ref   TEXT,
			pushed_at     TIMESTAMPTZ,
			push_status   TEXT DEFAULT 'pending',
			purchased_at  TIMESTAMPTZ DEFAULT now(),
			deleted       SMALLINT NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			token_id      TEXT REFERENCES tokens(id),
			channel       TEXT NOT NULL,
			phone         TEXT,
			amount_ksh    INTEGER NOT NULL,
			reference     TEXT,
			status        TEXT DEFAULT 'pending',
			provider_ref  TEXT,
			created_at    TIMESTAMPTZ DEFAULT now(),
			updated_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS alerts (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			type          TEXT NOT NULL,
			threshold     DOUBLE PRECISION NOT NULL,
			channel       TEXT NOT NULL DEFAULT 'push',
			enabled       BOOLEAN NOT NULL DEFAULT TRUE,
			last_fired_at TIMESTAMPTZ,
			created_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS push_method TEXT`,
		`ALTER TABLE meters ADD COLUMN IF NOT EXISTS name TEXT`,
		`CREATE TABLE IF NOT EXISTS outages (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			reporter_name TEXT,
			area          TEXT NOT NULL,
			latitude      DOUBLE PRECISION NOT NULL,
			longitude     DOUBLE PRECISION NOT NULL,
			description   TEXT,
			status        TEXT DEFAULT 'reported',
			created_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS energy_budgets (
			id                 TEXT PRIMARY KEY,
			meter_id           TEXT NOT NULL UNIQUE REFERENCES meters(id),
			monthly_budget_ksh DOUBLE PRECISION NOT NULL DEFAULT 2000,
			created_at         TIMESTAMPTZ DEFAULT now(),
			updated_at         TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS appliances (
			id            TEXT PRIMARY KEY,
			meter_id      TEXT NOT NULL REFERENCES meters(id),
			name          TEXT NOT NULL,
			watts         DOUBLE PRECISION NOT NULL,
			hours_per_day DOUBLE PRECISION NOT NULL DEFAULT 0,
			created_at    TIMESTAMPTZ DEFAULT now(),
			updated_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS power_pools (
			id          TEXT PRIMARY KEY,
			meter_id    TEXT NOT NULL REFERENCES meters(id),
			name        TEXT NOT NULL,
			invite_code TEXT NOT NULL UNIQUE,
			created_by  TEXT NOT NULL REFERENCES users(id),
			created_at  TIMESTAMPTZ DEFAULT now(),
			updated_at  TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS pool_members (
			id         TEXT PRIMARY KEY,
			pool_id    TEXT NOT NULL REFERENCES power_pools(id),
			user_id    TEXT NOT NULL REFERENCES users(id),
			role       TEXT NOT NULL DEFAULT 'member',
			can_buy    BOOLEAN NOT NULL DEFAULT TRUE,
			can_invite BOOLEAN NOT NULL DEFAULT FALSE,
			joined_at  TIMESTAMPTZ DEFAULT now(),
			UNIQUE (pool_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS pool_contributions (
			id         TEXT PRIMARY KEY,
			pool_id    TEXT NOT NULL REFERENCES power_pools(id),
			user_id    TEXT NOT NULL REFERENCES users(id),
			amount_ksh INTEGER NOT NULL,
			channel    TEXT NOT NULL DEFAULT 'mpesa',
			note       TEXT,
			created_at TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS pool_expenses (
			id          TEXT PRIMARY KEY,
			pool_id     TEXT NOT NULL REFERENCES power_pools(id),
			user_id     TEXT NOT NULL REFERENCES users(id),
			token_id    TEXT REFERENCES tokens(id),
			amount_ksh  INTEGER NOT NULL,
			description TEXT,
			created_at  TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS savings_goals (
			id           TEXT PRIMARY KEY,
			meter_id     TEXT NOT NULL REFERENCES meters(id),
			label        TEXT NOT NULL DEFAULT '',
			baseline_ksh DOUBLE PRECISION NOT NULL DEFAULT 0,
			target_ksh   DOUBLE PRECISION NOT NULL,
			active       BOOLEAN NOT NULL DEFAULT TRUE,
			achieved     BOOLEAN NOT NULL DEFAULT FALSE,
			created_at   TIMESTAMPTZ DEFAULT now(),
			achieved_at  TIMESTAMPTZ,
			updated_at   TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS challenge_points (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			challenge_key TEXT NOT NULL,
			week_start    DATE NOT NULL,
			points        INTEGER NOT NULL DEFAULT 0,
			created_at    TIMESTAMPTZ DEFAULT now(),
			UNIQUE (user_id, challenge_key, week_start)
		)`,
		`CREATE TABLE IF NOT EXISTS merchant_profiles (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL UNIQUE REFERENCES users(id),
			business_name TEXT NOT NULL,
			status        TEXT NOT NULL DEFAULT 'pending',
			created_at    TIMESTAMPTZ DEFAULT now(),
			updated_at    TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS merchant_ledger (
			id               TEXT PRIMARY KEY,
			user_id          TEXT NOT NULL REFERENCES users(id),
			type             TEXT NOT NULL,
			amount_ksh       INTEGER NOT NULL,
			reference        TEXT,
			customer_account TEXT,
			created_at       TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS meter_reserves (
			meter_id     TEXT PRIMARY KEY REFERENCES meters(id),
			reserved_kwh DOUBLE PRECISION NOT NULL DEFAULT 0,
			updated_at   TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS power_requests (
			id           TEXT PRIMARY KEY,
			user_id      TEXT NOT NULL REFERENCES users(id),
			meter_account TEXT NOT NULL,
			amount_ksh   INTEGER NOT NULL,
			note         TEXT,
			status       TEXT NOT NULL DEFAULT 'open',
			fulfilled_by TEXT REFERENCES users(id),
			created_at   TIMESTAMPTZ DEFAULT now(),
			fulfilled_at TIMESTAMPTZ
		)`,
		`CREATE TABLE IF NOT EXISTS marketplace_products (
			id                    TEXT PRIMARY KEY,
			category              TEXT NOT NULL,
			name                  TEXT NOT NULL,
			description           TEXT,
			price_ksh             INTEGER NOT NULL DEFAULT 0,
			est_savings_ksh_month DOUBLE PRECISION NOT NULL DEFAULT 0,
			active                SMALLINT NOT NULL DEFAULT 1,
			created_at            TIMESTAMPTZ DEFAULT now()
		)`,
		`INSERT INTO marketplace_products (id, category, name, description, price_ksh, est_savings_ksh_month, active)
		 VALUES
			('prod-swh','water','Solar water heater','Replaces the geyser that drives most Kenyan electricity bills, heating water free from the sun.',95000,1500),
			('prod-led','lighting','LED bulbs — 10 pack','Instant swap that cuts lighting load by ~80% versus incandescent bulbs.',1500,250),
			('prod-smartplug','smart','Smart plugs with energy monitoring','See exactly what each appliance draws and switch them off remotely.',3200,300),
			('prod-fridge','appliances','A++ rated inverter fridge','Up to 40% more efficient than an old fridge running all day.',42000,900),
			('prod-heatpump','water','Heat-pump water heater','Uses ~60% less power than a traditional geyser for the same hot water.',120000,1200),
			('prod-solar-kit','solar','Solar home backup system (5 kWh)','Battery + inverter keeps lights, TV and fridge running during outages and off-peak.',210000,2800),
			('prod-solar-2kw','solar','2 kW solar panel + inverter kit','Generate your own daytime power and slash monthly token spend.',280000,3000),
			('prod-audit','services','Energy efficiency home audit','A professional walks your home and finds the fastest ways to cut your bill.',5000,1000)
		 ON CONFLICT (id) DO NOTHING`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}
	log.Println("Database migrations complete")
}
