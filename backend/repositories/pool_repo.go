package repositories

import (
	"database/sql"
	"errors"

	"powersmart-backend/model"
)

// PoolRepo persists shared electricity wallets (Power Pools) and their ledgers.
type PoolRepo struct {
	db *sql.DB
}

func NewPoolRepo(db *sql.DB) *PoolRepo {
	return &PoolRepo{db: db}
}

// ── Pools ────────────────────────────────────────────────────────────────────

func (r *PoolRepo) CreatePool(p *model.PowerPool) error {
	_, err := r.db.Exec(`
		INSERT INTO power_pools (id, meter_id, name, invite_code, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, now(), now())`,
		p.ID, p.MeterID, p.Name, p.InviteCode, p.CreatedBy)
	return err
}

func (r *PoolRepo) GetPoolByID(id string) (*model.PowerPool, error) {
	p := &model.PowerPool{}
	err := r.db.QueryRow(`
		SELECT id, meter_id, name, invite_code, created_by, created_at, updated_at
		FROM power_pools WHERE id = $1`, id).
		Scan(&p.ID, &p.MeterID, &p.Name, &p.InviteCode, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

func (r *PoolRepo) GetPoolByInvite(code string) (*model.PowerPool, error) {
	p := &model.PowerPool{}
	err := r.db.QueryRow(`
		SELECT id, meter_id, name, invite_code, created_by, created_at, updated_at
		FROM power_pools WHERE invite_code = $1`, code).
		Scan(&p.ID, &p.MeterID, &p.Name, &p.InviteCode, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return p, err
}

// PoolIDsForUser lists the pool ids the user belongs to (newest first).
func (r *PoolRepo) PoolIDsForUser(userID string) ([]string, error) {
	rows, err := r.db.Query(`
		SELECT pool_id FROM pool_members WHERE user_id = $1
		ORDER BY joined_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// CountMembers returns the number of members in a pool.
func (r *PoolRepo) CountMembers(poolID string) (int, error) {
	var n int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM pool_members WHERE pool_id = $1`, poolID).Scan(&n)
	return n, err
}

// ── Members ──────────────────────────────────────────────────────────────────

func (r *PoolRepo) CreateMember(m *model.PoolMember) error {
	_, err := r.db.Exec(`
		INSERT INTO pool_members (id, pool_id, user_id, role, can_buy, can_invite, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		m.ID, m.PoolID, m.UserID, m.Role, m.CanBuy, m.CanInvite)
	return err
}

// GetMember returns the membership record for a user in a pool.
func (r *PoolRepo) GetMember(poolID, userID string) (*model.PoolMember, error) {
	m := &model.PoolMember{}
	err := r.db.QueryRow(`
		SELECT id, pool_id, user_id, role, can_buy, can_invite, joined_at
		FROM pool_members WHERE pool_id = $1 AND user_id = $2`, poolID, userID).
		Scan(&m.ID, &m.PoolID, &m.UserID, &m.Role, &m.CanBuy, &m.CanInvite, &m.JoinedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

// GetMemberByID returns a membership record by its own id.
func (r *PoolRepo) GetMemberByID(memberID string) (*model.PoolMember, error) {
	m := &model.PoolMember{}
	err := r.db.QueryRow(`
		SELECT id, pool_id, user_id, role, can_buy, can_invite, joined_at
		FROM pool_members WHERE id = $1`, memberID).
		Scan(&m.ID, &m.PoolID, &m.UserID, &m.Role, &m.CanBuy, &m.CanInvite, &m.JoinedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

// ListMembers returns every member of a pool with their display name and
// lifetime contribution total (owner first, then admins, then members).
func (r *PoolRepo) ListMembers(poolID string) ([]*model.PoolMember, error) {
	rows, err := r.db.Query(`
		SELECT pm.id, pm.pool_id, pm.user_id, pm.role, pm.can_buy, pm.can_invite, pm.joined_at,
		       u.name,
		       COALESCE((SELECT SUM(pc.amount_ksh) FROM pool_contributions pc WHERE pc.user_id = pm.user_id AND pc.pool_id = pm.pool_id), 0)
		FROM pool_members pm
		JOIN users u ON u.id = pm.user_id
		WHERE pm.pool_id = $1
		ORDER BY CASE pm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, pm.joined_at ASC`, poolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.PoolMember
	for rows.Next() {
		m := &model.PoolMember{}
		if err := rows.Scan(&m.ID, &m.PoolID, &m.UserID, &m.Role, &m.CanBuy, &m.CanInvite, &m.JoinedAt, &m.Name, &m.ContributedKsh); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func (r *PoolRepo) UpdateMember(m *model.PoolMember) error {
	_, err := r.db.Exec(`
		UPDATE pool_members SET role = $1, can_buy = $2, can_invite = $3 WHERE id = $4`,
		m.Role, m.CanBuy, m.CanInvite, m.ID)
	return err
}

// DeleteMember removes a member from a pool.
func (r *PoolRepo) DeleteMember(poolID, userID string) error {
	res, err := r.db.Exec(`DELETE FROM pool_members WHERE pool_id = $1 AND user_id = $2`, poolID, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Ledger ───────────────────────────────────────────────────────────────────

// Totals aggregates money in (contributions) and money out (expenses) for a pool.
func (r *PoolRepo) Totals(poolID string) (*model.PoolTotals, error) {
	t := &model.PoolTotals{}
	err := r.db.QueryRow(`
		SELECT
			COALESCE((SELECT SUM(amount_ksh) FROM pool_contributions WHERE pool_id = $1), 0),
			COALESCE((SELECT SUM(amount_ksh) FROM pool_expenses WHERE pool_id = $1), 0)`, poolID).
		Scan(&t.ContributionsKsh, &t.SpentKsh)
	return t, err
}

func (r *PoolRepo) CreateContribution(c *model.PoolContribution) error {
	_, err := r.db.Exec(`
		INSERT INTO pool_contributions (id, pool_id, user_id, amount_ksh, channel, note, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		c.ID, c.PoolID, c.UserID, c.AmountKsh, c.Channel, c.Note)
	return err
}

// ListContributions returns a pool's contributions with contributor names, newest first.
func (r *PoolRepo) ListContributions(poolID string) ([]*model.PoolContribution, error) {
	rows, err := r.db.Query(`
		SELECT pc.id, pc.pool_id, pc.user_id, pc.amount_ksh, pc.channel, COALESCE(pc.note, ''), pc.created_at, u.name
		FROM pool_contributions pc
		JOIN users u ON u.id = pc.user_id
		WHERE pc.pool_id = $1
		ORDER BY pc.created_at DESC`, poolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.PoolContribution
	for rows.Next() {
		c := &model.PoolContribution{}
		if err := rows.Scan(&c.ID, &c.PoolID, &c.UserID, &c.AmountKsh, &c.Channel, &c.Note, &c.CreatedAt, &c.UserName); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (r *PoolRepo) CreateExpense(e *model.PoolExpense) error {
	_, err := r.db.Exec(`
		INSERT INTO pool_expenses (id, pool_id, user_id, token_id, amount_ksh, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())`,
		e.ID, e.PoolID, e.UserID, e.TokenID, e.AmountKsh, e.Description)
	return err
}

// ListExpenses returns a pool's token purchases with actor and token details, newest first.
func (r *PoolRepo) ListExpenses(poolID string) ([]*model.PoolExpense, error) {
	rows, err := r.db.Query(`
		SELECT pe.id, pe.pool_id, pe.user_id, pe.amount_ksh,
		       COALESCE(pe.description, ''), pe.created_at, u.name,
		       COALESCE(pe.token_id, ''), COALESCE(t.token_number, ''), COALESCE(t.units, 0)
		FROM pool_expenses pe
		JOIN users u ON u.id = pe.user_id
		LEFT JOIN tokens t ON t.id = pe.token_id
		WHERE pe.pool_id = $1
		ORDER BY pe.created_at DESC`, poolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.PoolExpense
	for rows.Next() {
		e := &model.PoolExpense{}
		if err := rows.Scan(&e.ID, &e.PoolID, &e.UserID, &e.AmountKsh, &e.Description, &e.CreatedAt, &e.UserName, &e.TokenID, &e.TokenNumber, &e.TokenUnits); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}
