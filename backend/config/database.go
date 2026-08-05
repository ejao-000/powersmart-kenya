package config

import (
	"database/sql"
	"log"
	"os"

	_ "modernc.org/sqlite"
	//_ "github.com/go-sql-driver/mysql"
)

func ConnectDB() *sql.DB {
	driver := Getenv("DB_DRIVER", "sqlite")
	dsn := Getenv("DB_DSN", "./powersmart.db")

	db, err := sql.Open(driver, dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("DB ping error: %v", err)
	}
	log.Printf("Connected to %s database", driver)
	return db
}

// RunMigrations creates all tables if they do not exist.
func RunMigrations(db *sql.DB) {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			email       TEXT UNIQUE NOT NULL,
			phone       TEXT NOT NULL,
			password    TEXT NOT NULL,
			meter_account TEXT UNIQUE NOT NULL,
			meter_number  TEXT UNIQUE NOT NULL,
			role        TEXT NOT NULL DEFAULT 'tenant',
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		// Migration: Add role column to users table if it doesn't exist
		`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'tenant'`,
		`CREATE TABLE IF NOT EXISTS meters (
			id              TEXT PRIMARY KEY,
			user_id         TEXT NOT NULL REFERENCES users(id),
			landlord_id     TEXT REFERENCES users(id),
			units_remaining REAL NOT NULL DEFAULT 0,
			daily_avg_units REAL NOT NULL DEFAULT 0,
			last_reading_at DATETIME,
			auto_topup      INTEGER DEFAULT 0,
			topup_threshold REAL DEFAULT 5,
			topup_amount    INTEGER DEFAULT 200,
			updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		// Migration: Add landlord_id column to meters table if it doesn't exist
		`ALTER TABLE meters ADD COLUMN landlord_id TEXT REFERENCES users(id)`,
		`CREATE TABLE IF NOT EXISTS tokens (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			meter_id      TEXT NOT NULL REFERENCES meters(id),
			token_number  TEXT NOT NULL,
			units         REAL NOT NULL,
			amount_ksh    INTEGER NOT NULL,
			payment_ref   TEXT,
			pushed_at     DATETIME,
			push_status   TEXT DEFAULT 'pending',
			purchased_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			deleted       INTEGER DEFAULT 0
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
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS alerts (
			id            TEXT PRIMARY KEY,
			user_id       TEXT NOT NULL REFERENCES users(id),
			type          TEXT NOT NULL,
			threshold     REAL NOT NULL,
			channel       TEXT NOT NULL DEFAULT 'push',
			enabled       INTEGER DEFAULT 1,
			last_fired_at DATETIME,
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}
	log.Println("Database migrations complete")

	_ = os.Getenv // suppress unused import if env not used here
}
