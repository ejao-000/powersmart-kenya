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
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}
	log.Println("Database migrations complete")
}
