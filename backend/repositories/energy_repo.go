package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

// EnergyRepo persists monthly budgets and household appliances (the two inputs
// to the Energy Intelligence hub). Usage maths lives in the service layer.
type EnergyRepo struct {
	db *sql.DB
}

func NewEnergyRepo(db *sql.DB) *EnergyRepo {
	return &EnergyRepo{db: db}
}

// ── Budgets ──────────────────────────────────────────────────────────────────

// GetBudgetByMeter returns the saved budget for a meter, or ErrNotFound.
func (r *EnergyRepo) GetBudgetByMeter(meterID string) (*model.EnergyBudget, error) {
	b := &model.EnergyBudget{}
	err := r.db.QueryRow(`
		SELECT id, meter_id, monthly_budget_ksh, created_at, updated_at
		FROM energy_budgets WHERE meter_id = $1`, meterID).
		Scan(&b.ID, &b.MeterID, &b.MonthlyBudgetKsh, &b.CreatedAt, &b.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return b, err
}

// UpsertBudget inserts a budget row for the meter, or updates the existing one.
func (r *EnergyRepo) UpsertBudget(id, meterID string, amount float64) (*model.EnergyBudget, error) {
	b := &model.EnergyBudget{}
	err := r.db.QueryRow(`
		INSERT INTO energy_budgets (id, meter_id, monthly_budget_ksh, created_at, updated_at)
		VALUES ($1, $2, $3, now(), now())
		ON CONFLICT (meter_id) DO UPDATE
		  SET monthly_budget_ksh = EXCLUDED.monthly_budget_ksh,
		      updated_at        = now()
		RETURNING id, meter_id, monthly_budget_ksh, created_at, updated_at`,
		id, meterID, amount).
		Scan(&b.ID, &b.MeterID, &b.MonthlyBudgetKsh, &b.CreatedAt, &b.UpdatedAt)
	return b, err
}

// ── Appliances ───────────────────────────────────────────────────────────────

// ListAppliances returns every appliance registered to a meter (oldest first).
func (r *EnergyRepo) ListAppliances(meterID string) ([]*model.EnergyAppliance, error) {
	rows, err := r.db.Query(`
		SELECT id, meter_id, name, watts, hours_per_day, created_at, updated_at
		FROM appliances WHERE meter_id = $1
		ORDER BY created_at ASC`, meterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.EnergyAppliance
	for rows.Next() {
		a := &model.EnergyAppliance{}
		if err := rows.Scan(
			&a.ID, &a.MeterID, &a.Name, &a.Watts, &a.HoursPerDay, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

// GetApplianceByID returns a single appliance, or ErrNotFound.
func (r *EnergyRepo) GetApplianceByID(id string) (*model.EnergyAppliance, error) {
	a := &model.EnergyAppliance{}
	err := r.db.QueryRow(`
		SELECT id, meter_id, name, watts, hours_per_day, created_at, updated_at
		FROM appliances WHERE id = $1`, id).
		Scan(&a.ID, &a.MeterID, &a.Name, &a.Watts, &a.HoursPerDay, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

func (r *EnergyRepo) CreateAppliance(a *model.EnergyAppliance) error {
	_, err := r.db.Exec(`
		INSERT INTO appliances (id, meter_id, name, watts, hours_per_day, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, now(), now())`,
		a.ID, a.MeterID, a.Name, a.Watts, a.HoursPerDay)
	return err
}

func (r *EnergyRepo) UpdateAppliance(a *model.EnergyAppliance) error {
	_, err := r.db.Exec(`
		UPDATE appliances
		SET name = $1, watts = $2, hours_per_day = $3, updated_at = now()
		WHERE id = $4`,
		a.Name, a.Watts, a.HoursPerDay, a.ID)
	return err
}

func (r *EnergyRepo) DeleteAppliance(id string) error {
	_, err := r.db.Exec(`DELETE FROM appliances WHERE id = $1`, id)
	return err
}
