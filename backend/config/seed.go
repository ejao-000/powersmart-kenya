package config

import (
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdminIfConfigured creates the initial administrator account from
// environment variables when they are present:
//
//	ADMIN_NAME=Super Administrator
//	ADMIN_EMAIL=admin@powersmart.ke
//	ADMIN_PASSWORD=<strong password>
//
// Admins are deliberately NOT creatable through the public registration API.
// When ADMIN_EMAIL / ADMIN_PASSWORD are unset, seeding is skipped.
func SeedAdminIfConfigured(db *sql.DB) {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	if name == "" {
		name = "System Administrator"
	}

	if email == "" || password == "" {
		log.Println("[seed] No ADMIN_EMAIL/ADMIN_PASSWORD set — skipping admin seeding.")
		return
	}

	var exists int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&exists); err != nil {
		log.Printf("[seed] Could not check for existing admin: %v", err)
		return
	}
	if exists > 0 {
		log.Printf("[seed] Admin %s already exists — skipping.", email)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[seed] Failed to hash admin password: %v", err)
		return
	}

	id := uuid.NewString()
	tag := strings.ToUpper(id[:8])
	_, err = db.Exec(`
		INSERT INTO users (id, name, email, phone, password, meter_account, meter_number, role, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?)`,
		id, name, email, "0000000000", string(hash),
		"ADMIN-"+tag, "ADMIN-"+tag, time.Now(),
	)
	if err != nil {
		log.Printf("[seed] Failed to create admin account: %v", err)
		return
	}

	log.Printf("[seed] Admin account created for %s (role=admin).", email)
}
