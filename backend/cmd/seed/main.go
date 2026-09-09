// Demo seed for PowerSmart Kenya.
//
// Creates realistic users, meters, readings, appliances, budgets, tokens,
// pools, challenges and outage data so every dashboard lights up in local
// development. Safe to run repeatedly — it skips when the demo accounts exist.
//
// Usage:
//
//	cd backend
//	go run ./cmd/seed
//
// Demo logins (password: DemoPass1):
//
//	Tenant  (owner of a Power Pool): emma@demo.com
//	Pool member:                     brian@demo.com
//	Landlord (manages 3 units):      landlord@demo.com
//	Tenant  (leaderboard rival):     grace@demo.com
package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"powersmart-backend/config"
)

const demoPassword = "DemoPass1"

func main() {
	config.LoadEnv()
	db := config.ConnectDB()
	config.RunMigrations(db)

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE email IN ('emma@demo.com','brian@demo.com','landlord@demo.com','grace@demo.com')`).Scan(&count); err != nil {
		log.Fatalf("check failed: %v", err)
	}
	if count > 0 {
		log.Println("Demo data already present — skipping. (Delete the demo rows to re-seed.)")
		return
	}

	rng := rand.New(rand.NewSource(20260901))
	hash, _ := bcrypt.GenerateFromPassword([]byte(demoPassword), bcrypt.DefaultCost)
	pw := string(hash)
	now := time.Now()

	// ── Tenants ────────────────────────────────────────────────────────────
	emma := newUser(db, "Emma Wanjiku", "emma@demo.com", "0712345678", "1000000001", "KPM1000000001", "tenant", pw)
	brian := newUser(db, "Brian Otieno", "brian@demo.com", "0722345678", "1000000002", "KPM1000000002", "tenant", pw)
	grace := newUser(db, "Grace Achieng", "grace@demo.com", "0733345678", "1000000003", "KPM1000000003", "tenant", pw)
	landlord := newUser(db, "Jane Muthoni", "landlord@demo.com", "0700456789", "1000000020", "KPM1000000020", "landlord", pw)

	// Neighborhoods for the local challenge board.
	mustExec(db, `UPDATE users SET neighborhood = 'Kilimani' WHERE id = $1`, emma)
	mustExec(db, `UPDATE users SET neighborhood = 'Kilimani' WHERE id = $1`, brian)
	mustExec(db, `UPDATE users SET neighborhood = 'Kilimani' WHERE id = $1`, grace)
	mustExec(db, `UPDATE users SET neighborhood = 'South B' WHERE id = $1`, landlord)

	// ── Meters ─────────────────────────────────────────────────────────────
	emmaMeter := seedMeter(db, emma, "Apartment 4B, Westlands", "KPM1000000001", 12.0, 1.0, false, 5, 200, now)
	brianMeter := seedMeter(db, brian, "Studio, Kilimani", "KPM1000000002", 9.0, 1.0, false, 5, 200, now)
	graceMeter := seedMeter(db, grace, "Bedsitter, South B", "KPM1000000003", 7.0, 1.0, false, 5, 200, now)
	landlordMeter := seedMeter(db, landlord, "Unit 0 — Manager", "KPM1000000020", 10.0, 1.0, false, 5, 200, now)

	// Landlord's rental units (owned under the landlord account).
	unit1 := seedMeter(db, landlord, "Unit 1 — Family", "KPM1000000021", 12.0, 1.0, true, 8, 500, now)
	unit2 := seedMeter(db, landlord, "Unit 2 — Spiking", "KPM1000000022", 18.0, 1.9, true, 8, 500, now) // anomaly demo
	unit3 := seedMeter(db, landlord, "Unit 3 — Retired", "KPM1000000023", 5.0, 0.6, false, 5, 200, now)

	// ── Usage history (60 days of daily readings with occasional top-ups) ──
	seedReadings(db, emmaMeter, 12.0, 1.0, rng, now)
	seedReadings(db, brianMeter, 9.0, 1.0, rng, now)
	seedReadings(db, graceMeter, 7.0, 1.0, rng, now)
	seedReadings(db, landlordMeter, 10.0, 1.0, rng, now)
	seedReadings(db, unit1, 12.0, 1.0, rng, now)
	seedReadings(db, unit2, 18.0, 1.9, rng, now) // +90% last week → flagged
	seedReadings(db, unit3, 5.0, 0.6, rng, now)

	// ── Appliances ─────────────────────────────────────────────────────────
	seedAppliance(db, emmaMeter, "Refrigerator", 150, 24)
	seedAppliance(db, emmaMeter, "Flat-screen TV", 120, 6)
	seedAppliance(db, emmaMeter, "Water heater", 2000, 1.2)
	seedAppliance(db, brianMeter, "Refrigerator", 150, 24)
	seedAppliance(db, brianMeter, "Ceiling Fan", 75, 8)
	seedAppliance(db, unit1, "Refrigerator", 150, 24)
	seedAppliance(db, unit1, "Flat-screen TV", 120, 6)
	seedAppliance(db, unit2, "Refrigerator", 150, 24)
	seedAppliance(db, unit2, "Water heater", 2000, 2)
	seedAppliance(db, unit3, "Lights", 60, 5)
	seedAppliance(db, graceMeter, "Refrigerator", 150, 24)

	// ── Budgets + savings goals ────────────────────────────────────────────
	seedBudget(db, emmaMeter, 2000)
	seedBudget(db, unit1, 2500)
	seedBudget(db, unit2, 2200)
	seedBudget(db, unit3, 1200)
	seedGoal(db, emmaMeter, "Cut monthly spend from KSh 2,500 to 1,800", 2500, 1800)

	// ── Tokens + purchases ─────────────────────────────────────────────────
	seedTokens(db, emmaMeter, emma, []int{500, 1000, 500}, now)
	seedTokens(db, brianMeter, brian, []int{500, 1000}, now)
	seedTokens(db, graceMeter, grace, []int{500, 1000}, now)
	seedTokens(db, landlordMeter, landlord, []int{1000, 2000}, now)
	seedTokens(db, unit1, landlord, []int{500, 1000, 500}, now)
	seedTokens(db, unit2, landlord, []int{1000, 1000, 1000}, now)
	seedTokens(db, unit3, landlord, []int{500}, now)

	// A recent 500 KSh purchase on the pool meter for the pool ledger demo.
	poolToken := seedToken(db, emmaMeter, emma, 500, now.Add(-2*24*time.Hour), "success")

	// ── Power Pool (Campus House) ──────────────────────────────────────────
	poolID := uuid.NewString()
	mustExec(db, `INSERT INTO power_pools (id, meter_id, name, invite_code, created_by, created_at, updated_at)
		VALUES ($1,$2,'Campus House Power Pool','CAMPUS01',$3,now(),now())`,
		poolID, emmaMeter, emma)
	emmaMember := uuid.NewString()
	brianMember := uuid.NewString()
	mustExec(db, `INSERT INTO pool_members (id, pool_id, user_id, role, can_buy, can_invite, joined_at) VALUES ($1,$2,$3,'owner',TRUE,TRUE,now())`, emmaMember, poolID, emma)
	mustExec(db, `INSERT INTO pool_members (id, pool_id, user_id, role, can_buy, can_invite, joined_at) VALUES ($1,$2,$3,'member',TRUE,FALSE,now())`, brianMember, poolID, brian)
	mustExec(db, `INSERT INTO pool_contributions (id, pool_id, user_id, amount_ksh, channel, note, created_at) VALUES ($1,$2,$3,600,'mpesa','Monthly contribution',now())`, uuid.NewString(), poolID, emma)
	mustExec(db, `INSERT INTO pool_contributions (id, pool_id, user_id, amount_ksh, channel, note, created_at) VALUES ($1,$2,$3,600,'airtel','Monthly contribution',now())`, uuid.NewString(), poolID, brian)
	mustExec(db, `INSERT INTO pool_expenses (id, pool_id, user_id, token_id, amount_ksh, description, created_at) VALUES ($1,$2,$3,$4,500,'Shared token purchase',now())`,
		uuid.NewString(), poolID, emma, poolToken)

	// ── Savings leaderboard + challenge points ─────────────────────────────
	weekStart := mondayOf(now)
	prevWeek := weekStart.AddDate(0, 0, -7)
	seedChallenge(db, emma, "cut_10", prevWeek, 60)
	seedChallenge(db, emma, "budget_safe", prevWeek, 40)
	seedChallenge(db, emma, "cut_10", weekStart, 60)
	seedChallenge(db, grace, "off_peak", prevWeek, 25)
	seedChallenge(db, grace, "cut_10", prevWeek, 60)

	// ── Outages ────────────────────────────────────────────────────────────
	mustExec(db, `INSERT INTO outages (id,user_id,reporter_name,area,latitude,longitude,description,status,created_at)
		VALUES ($1,$2,'Emma Wanjiku','Nairobi West',-1.2946,36.7942,'Power out on Kabiria Rd for ~30 minutes', 'reported', now())`,
		uuid.NewString(), emma)
	mustExec(db, `INSERT INTO outages (id,user_id,reporter_name,area,latitude,longitude,description,status,created_at)
		VALUES ($1,$2,'Grace Achieng','Kilimani',-1.2895,36.7900,'Maintenance completed', 'resolved', now())`,
		uuid.NewString(), grace)

	// ── Merchant demo (landlord's shop) ────────────────────────────────────
	merchantID := uuid.NewString()
	mustExec(db, `INSERT INTO merchant_profiles (id,user_id,business_name,status,created_at,updated_at)
		VALUES ($1,$2,'Muthoni Power Shop','active',now(),now())`, merchantID, landlord)
	mustExec(db, `INSERT INTO merchant_ledger (id,user_id,type,amount_ksh,reference,created_at) VALUES ($1,$2,'topup',10000,'TOP-DEMO',now())`, uuid.NewString(), landlord)
	mustExec(db, `INSERT INTO merchant_ledger (id,user_id,type,amount_ksh,reference,customer_account,created_at) VALUES ($1,$2,'sale',500,'VEND-DEMO','1000000001',now())`, uuid.NewString(), landlord)
	mustExec(db, `INSERT INTO merchant_ledger (id,user_id,type,amount_ksh,reference,customer_account,created_at) VALUES ($1,$2,'sale',300,'VEND-DEMO','1000000003',now())`, uuid.NewString(), landlord)

	fmt.Println()
	fmt.Println("✅ Demo data seeded!")
	fmt.Println()
	fmt.Println("Logins (password: DemoPass1):")
	fmt.Println("  Emma (tenant · Power Pool owner)   emma@demo.com")
	fmt.Println("  Brian (tenant · pool member)        brian@demo.com")
	fmt.Println("  Grace (tenant · leaderboard rival)  grace@demo.com")
	fmt.Println("  Jane (landlord · 3 units + vendor)  landlord@demo.com")
	fmt.Println()
	fmt.Println("Try: Tenant dashboard → Energy Intelligence, Savings Hub, Power Pools;")
	fmt.Println("     Landlord portal → Unit Insights (Unit 2 is flagged as spiking).")
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func newUser(db *sql.DB, name, email, phone, account, meterNumber, role, pw string) string {
	id := uuid.NewString()
	mustExec(db, `INSERT INTO users (id,name,email,phone,password,meter_account,meter_number,role,created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`,
		id, name, email, phone, pw, account, meterNumber, role)
	return id
}

func seedMeter(db *sql.DB, userID, name, meterNumber string, baseDaily, spike float64, autoTopup bool, threshold int, topupAmount int, now time.Time) string {
	id := uuid.NewString()
	units := meterReadingModel(baseDaily, spike, 60, now, nil) // last value reused below
	avg := round(meanDaily(baseDaily, spike, 60))
	mustExec(db, `INSERT INTO meters (id,user_id,name,meter_number,units_remaining,daily_avg_units,last_reading_at,auto_topup,topup_threshold,topup_amount,updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,now())`,
		id, userID, name, meterNumber, units, avg, autoTopup, threshold, topupAmount)
	return id
}

// seedReadings writes 60 daily readings ending today and updates the meter's
// current balance to the final modelled value.
func seedReadings(db *sql.DB, meterID string, baseDaily, spike float64, rng *rand.Rand, now time.Time) {
	values := meterReadingModel(baseDaily, spike, 60, now, nil)
	mustExec(db, `UPDATE meters SET units_remaining = $1, last_reading_at = now(), updated_at = now() WHERE id = $2`, values[len(values)-1], meterID)
}

// meterReadingModel simulates units_remaining across n days with consumption
// profile[j] each day and periodic top-ups so the balance never runs dry.
func meterReadingModel(baseDaily, spike float64, n int, now time.Time, _ *rand.Rand) []float64 {
	out := make([]float64, n)
	balance := 40.0
	for j := 0; j < n; j++ {
		consume := baseDaily
		if j >= n-7 && spike > 1.0 {
			consume = baseDaily * spike
		}
		balance -= consume
		if balance < 25 {
			balance += baseDaily * 20 // simulate a ~20-day top-up
		}
		if balance < 0 {
			balance = 0
		}
		out[j] = round(balance)
	}
	return out
}

func meanDaily(base, spike float64, n int) float64 {
	total := 0.0
	for j := 0; j < n; j++ {
		d := base
		if j >= n-7 && spike > 1.0 {
			d = base * spike
		}
		total += d
	}
	return total / float64(n)
}

func seedAppliance(db *sql.DB, meterID, name string, watts, hours float64) {
	mustExec(db, `INSERT INTO appliances (id,meter_id,name,watts,hours_per_day,created_at,updated_at)
		VALUES ($1,$2,$3,$4,$5,now(),now())`, uuid.NewString(), meterID, name, watts, hours)
}

func seedBudget(db *sql.DB, meterID string, ksh int) {
	mustExec(db, `INSERT INTO energy_budgets (id,meter_id,monthly_budget_ksh,created_at,updated_at)
		VALUES ($1,$2,$3,now(),now())`, uuid.NewString(), meterID, ksh)
}

func seedGoal(db *sql.DB, meterID, label string, baseline, target float64) {
	mustExec(db, `INSERT INTO savings_goals (id,meter_id,label,baseline_ksh,target_ksh,active,achieved,created_at,updated_at)
		VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,now(),now())`, uuid.NewString(), meterID, label, baseline, target)
}

func seedTokens(db *sql.DB, meterID, userID string, amounts []int, now time.Time) {
	for i, amt := range amounts {
		age := time.Duration(len(amounts)-i) * 9 * 24 * time.Hour
		status := "success"
		if i == len(amounts)-1 {
			status = "pending"
		}
		seedToken(db, meterID, userID, amt, now.Add(-age), status)
	}
}

func seedToken(db *sql.DB, meterID, userID string, amount int, when time.Time, status string) string {
	id := uuid.NewString()
	tokenNum := fmt.Sprintf("%020d", (rand.Intn(900000)+100000)*(rand.Intn(1_000_000_000_000)+1))
	units := float64(amount) * 0.2
	var pushedAt interface{}
	if status == "success" {
		pushedAt = when.Add(5 * time.Minute)
	}
	mustExec(db, `INSERT INTO tokens (id,user_id,meter_id,token_number,units,amount_ksh,payment_ref,pushed_at,push_status,push_method,purchased_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'wifi',$10)`,
		id, userID, meterID, tokenNum, units, amount, "PS-DEMO", pushedAt, status, when)
	return id
}

func seedChallenge(db *sql.DB, userID, key string, week time.Time, points int) {
	mustExec(db, `INSERT INTO challenge_points (id,user_id,challenge_key,week_start,points,created_at)
		VALUES ($1,$2,$3,$4,$5,now())`,
		uuid.NewString(), userID, key, week.Format("2006-01-02"), points)
}

func mondayOf(t time.Time) time.Time {
	t = t.UTC()
	offset := (int(t.Weekday()) + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -offset)
}

func mustExec(db *sql.DB, query string, args ...interface{}) {
	if _, err := db.Exec(query, args...); err != nil {
		log.Fatalf("seed error: %v", err)
	}
}

func round(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}
