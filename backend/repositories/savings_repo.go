package repositories

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
)

// SavingsRepo persists savings goals and challenge points/leaderboard data.
type SavingsRepo struct {
	db *sql.DB
}

func NewSavingsRepo(db *sql.DB) *SavingsRepo {
	return &SavingsRepo{db: db}
}

// ── Savings goals ────────────────────────────────────────────────────────────

func (r *SavingsRepo) CreateGoal(g *model.SavingsGoal) error {
	_, err := r.db.Exec(`
		INSERT INTO savings_goals (id, meter_id, label, baseline_ksh, target_ksh, active, achieved, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
		g.ID, g.MeterID, g.Label, g.BaselineKsh, g.TargetKsh, g.Active, g.Achieved)
	return err
}

// DeactivateActiveGoals soft-disables other active goals for the meter so each
// meter keeps at most one active goal.
func (r *SavingsRepo) DeactivateActiveGoals(meterID, exceptID string) error {
	_, err := r.db.Exec(`
		UPDATE savings_goals SET active = FALSE, updated_at = now()
		WHERE meter_id = $1 AND active = TRUE AND id <> $2`, meterID, exceptID)
	return err
}

// ListGoalsByUser returns every goal for meters the user owns (newest first).
func (r *SavingsRepo) ListGoalsByUser(userID string) ([]*model.SavingsGoal, error) {
	rows, err := r.db.Query(`
		SELECT sg.id, sg.meter_id, COALESCE(sg.label, ''), sg.baseline_ksh, sg.target_ksh,
		       sg.active, sg.achieved, sg.created_at, sg.achieved_at,
		       COALESCE(m.name, m.meter_number, 'Meter')
		FROM savings_goals sg
		JOIN meters m ON m.id = sg.meter_id
		WHERE m.user_id = $1
		ORDER BY sg.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.SavingsGoal
	for rows.Next() {
		g := &model.SavingsGoal{}
		if err := rows.Scan(&g.ID, &g.MeterID, &g.Label, &g.BaselineKsh, &g.TargetKsh,
			&g.Active, &g.Achieved, &g.CreatedAt, &g.AchievedAt, &g.MeterName); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return list, rows.Err()
}

func (r *SavingsRepo) GetGoalByID(id string) (*model.SavingsGoal, error) {
	g := &model.SavingsGoal{}
	err := r.db.QueryRow(`
		SELECT sg.id, sg.meter_id, COALESCE(sg.label, ''), sg.baseline_ksh, sg.target_ksh,
		       sg.active, sg.achieved, sg.created_at, sg.achieved_at
		FROM savings_goals sg WHERE sg.id = $1`, id).
		Scan(&g.ID, &g.MeterID, &g.Label, &g.BaselineKsh, &g.TargetKsh,
			&g.Active, &g.Achieved, &g.CreatedAt, &g.AchievedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return g, err
}

func (r *SavingsRepo) CompleteGoal(id string) error {
	_, err := r.db.Exec(`
		UPDATE savings_goals SET achieved = TRUE, active = FALSE, achieved_at = now(), updated_at = now()
		WHERE id = $1`, id)
	return err
}

func (r *SavingsRepo) DeleteGoal(id string) error {
	_, err := r.db.Exec(`DELETE FROM savings_goals WHERE id = $1`, id)
	return err
}

// ── Challenge points ─────────────────────────────────────────────────────────

func (r *SavingsRepo) HasChallengeClaim(userID, challengeKey string, weekStart time.Time) (bool, error) {
	var n int
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM challenge_points
		WHERE user_id = $1 AND challenge_key = $2 AND week_start = $3`,
		userID, challengeKey, weekStart).Scan(&n)
	return n > 0, err
}

func (r *SavingsRepo) AddChallengePoints(userID, challengeKey string, weekStart time.Time, points int) error {
	_, err := r.db.Exec(`
		INSERT INTO challenge_points (id, user_id, challenge_key, week_start, points, created_at)
		VALUES ($1, $2, $3, $4, $5, now())`,
		uuid.NewString(), userID, challengeKey, weekStart, points)
	return err
}

// UserChallengeKeys returns the challenge keys the user completed this week.
func (r *SavingsRepo) UserChallengeKeys(userID string, weekStart time.Time) ([]string, error) {
	rows, err := r.db.Query(`
		SELECT challenge_key FROM challenge_points
		WHERE user_id = $1 AND week_start = $2`, userID, weekStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// UserTotals returns a user's lifetime points and claim count.
func (r *SavingsRepo) UserTotals(userID string) (points, claims int, err error) {
	err = r.db.QueryRow(`
		SELECT COALESCE(SUM(points), 0), COUNT(*)
		FROM challenge_points WHERE user_id = $1`, userID).Scan(&points, &claims)
	return points, claims, err
}

// TopChallengeUsers returns the highest-scoring users platform-wide.
func (r *SavingsRepo) TopChallengeUsers(limit int) ([]*model.LeaderboardRow, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(`
		SELECT u.name, COALESCE(SUM(cp.points), 0), COUNT(cp.id)
		FROM users u
		LEFT JOIN challenge_points cp ON cp.user_id = u.id
		GROUP BY u.id, u.name
		HAVING COUNT(cp.id) > 0
		ORDER BY SUM(cp.points) DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.LeaderboardRow
	for rows.Next() {
		row := &model.LeaderboardRow{}
		if err := rows.Scan(&row.UserName, &row.Points, &row.Claims); err != nil {
			return nil, err
		}
		list = append(list, row)
	}
	return list, rows.Err()
}
