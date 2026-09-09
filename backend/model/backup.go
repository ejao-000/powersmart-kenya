package model

import "time"

// ── Backup power + blackout risk ─────────────────────────────────────────────

// BackupSource is a user's backup power device (solar, inverter, battery,
// generator, power station). The frontend uses capacity × charge to estimate
// how long essential appliances can run during an outage.
type BackupSource struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Type        string    `json:"type"` // solar | inverter | battery | generator | power_station
	Name        string    `json:"name"`
	CapacityKwh float64   `json:"capacity_kwh"`
	ChargePct   float64   `json:"charge_pct"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UpsertBackupRequest creates or updates a backup source (one per type).
type UpsertBackupRequest struct {
	Type        string  `json:"type"`
	Name        string  `json:"name"`
	CapacityKwh float64 `json:"capacity_kwh"`
	ChargePct   float64 `json:"charge_pct"`
}

// OutageRisk is the blackout-likelihood estimate for the user's neighbourhood.
type OutageRisk struct {
	RiskPct int      `json:"risk_pct"`
	Level   string   `json:"level"` // low | moderate | high | very_high
	Reasons []string `json:"reasons"`
	Tips    []string `json:"tips"`
}
