package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// Emission factors & constants.
const (
	// Kenya grid intensity is dominated by renewables (hydro, geothermal, wind);
	// ~0.44 kg CO₂e per kWh is a commonly used planning estimate.
	CarbonKgPerKwh = 0.44
	// A mature tree absorbs roughly 21 kg CO₂ per year (≈1.75 kg/month).
	KgPerTreePerMonth = 1.75
)

// SavingsService powers the Savings Hub: reduction goals, weekly challenges,
// points + leaderboard and carbon estimates.
type SavingsService struct {
	meterRepo   *repositories.MeterRepo
	savingsRepo *repositories.SavingsRepo
	userRepo    *repositories.UserRepo
	usageSvc    *UsageService
	energyRepo  *repositories.EnergyRepo
}

func NewSavingsService(
	meterRepo *repositories.MeterRepo,
	savingsRepo *repositories.SavingsRepo,
	userRepo *repositories.UserRepo,
	usageSvc *UsageService,
	energyRepo *repositories.EnergyRepo,
) *SavingsService {
	return &SavingsService{
		meterRepo:   meterRepo,
		savingsRepo: savingsRepo,
		userRepo:    userRepo,
		usageSvc:    usageSvc,
		energyRepo:  energyRepo,
	}
}

// weekStart returns the Monday (UTC) that starts the caller's current week.
func weekStart(now time.Time) time.Time {
	now = now.UTC()
	offset := (int(now.Weekday()) + 6) % 7 // Monday = 0
	monday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -offset)
	return monday
}

func (s *SavingsService) primaryMeter(userID string) (*model.Meter, error) {
	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, fmt.Errorf("%w: no meter linked to this account", ErrInvalid)
		}
		return nil, err
	}
	return meter, nil
}

// ── Savings goals ────────────────────────────────────────────────────────────

// CreateGoal starts a reduction goal on the user's meter.
func (s *SavingsService) CreateGoal(userID string, req *model.CreateGoalRequest) (*model.SavingsGoal, error) {
	meter := (*model.Meter)(nil)
	var err error
	if req.MeterID != "" {
		meter, err = s.meterRepo.GetByIDForUser(req.MeterID, userID)
		if err != nil {
			return nil, fmt.Errorf("%w: meter not found", ErrInvalid)
		}
	} else {
		meter, err = s.primaryMeter(userID)
		if err != nil {
			return nil, err
		}
	}

	usage, err := s.usageSvc.SummarizeMeter(meter)
	if err != nil {
		return nil, err
	}
	baseline := usage.MonthCostKsh
	if baseline <= 0 {
		return nil, fmt.Errorf("%w: we need about a month of readings to set a realistic goal", ErrInvalid)
	}
	if req.TargetKsh < 100 {
		return nil, fmt.Errorf("%w: target must be at least KSh 100", ErrInvalid)
	}
	if req.TargetKsh >= baseline {
		return nil, fmt.Errorf("%w: target must be lower than your current spend of %s/month", ErrInvalid, fmtKshPlain(baseline))
	}

	label := strings.TrimSpace(req.Label)
	if label == "" {
		label = fmt.Sprintf("Cut monthly spend from %s to %s", fmtKshPlain(baseline), fmtKshPlain(req.TargetKsh))
	}

	goal := &model.SavingsGoal{
		ID:          uuid.NewString(),
		MeterID:     meter.ID,
		Label:       label,
		BaselineKsh: round2(baseline),
		TargetKsh:   round2(req.TargetKsh),
		Active:      true,
		Achieved:    false,
		CreatedAt:   time.Now(),
	}
	if err := s.savingsRepo.CreateGoal(goal); err != nil {
		return nil, err
	}
	_ = s.savingsRepo.DeactivateActiveGoals(goal.MeterID, goal.ID)
	return s.goalWithProgress(goal)
}

// ListGoals returns the user's goals with live progress against current usage.
func (s *SavingsService) ListGoals(userID string) ([]*model.SavingsGoal, error) {
	goals, err := s.savingsRepo.ListGoalsByUser(userID)
	if err != nil {
		return nil, err
	}
	if goals == nil {
		goals = []*model.SavingsGoal{}
	}

	// Cache each meter's current monthly spend to avoid repeated usage calls.
	spendByMeter := map[string]float64{}
	for _, g := range goals {
		if _, ok := spendByMeter[g.MeterID]; ok {
			continue
		}
		if meter, err := s.meterRepo.GetByID(g.MeterID); err == nil {
			if usage, err := s.usageSvc.SummarizeMeter(meter); err == nil {
				spendByMeter[g.MeterID] = usage.MonthCostKsh
			}
		}
	}

	out := make([]*model.SavingsGoal, 0, len(goals))
	for _, g := range goals {
		current := spendByMeter[g.MeterID]
		progress := goalProgress(g.BaselineKsh, g.TargetKsh, current)
		g.CurrentKsh = round2(current)
		g.ProgressPct = round2(progress)
		out = append(out, g)
	}
	return out, nil
}

// CompleteGoal marks a goal as achieved (after verifying ownership).
func (s *SavingsService) CompleteGoal(userID, goalID string) error {
	goal, err := s.savingsRepo.GetGoalByID(goalID)
	if err != nil {
		return err
	}
	if _, err := s.meterRepo.GetByIDForUser(goal.MeterID, userID); err != nil {
		return fmt.Errorf("%w: goal belongs to another account", ErrForbidden)
	}
	return s.savingsRepo.CompleteGoal(goalID)
}

// DeleteGoal removes a goal (after verifying ownership).
func (s *SavingsService) DeleteGoal(userID, goalID string) error {
	goal, err := s.savingsRepo.GetGoalByID(goalID)
	if err != nil {
		return err
	}
	if _, err := s.meterRepo.GetByIDForUser(goal.MeterID, userID); err != nil {
		return fmt.Errorf("%w: goal belongs to another account", ErrForbidden)
	}
	return s.savingsRepo.DeleteGoal(goalID)
}

func (s *SavingsService) goalWithProgress(g *model.SavingsGoal) (*model.SavingsGoal, error) {
	meter, err := s.meterRepo.GetByID(g.MeterID)
	if err != nil {
		return g, nil
	}
	if usage, err := s.usageSvc.SummarizeMeter(meter); err == nil {
		g.CurrentKsh = round2(usage.MonthCostKsh)
		g.ProgressPct = round2(goalProgress(g.BaselineKsh, g.TargetKsh, usage.MonthCostKsh))
	}
	return g, nil
}

func goalProgress(baseline, target, current float64) float64 {
	if baseline <= target {
		return 100 // nothing to reduce
	}
	if current <= target {
		return 100
	}
	if current >= baseline {
		return 0
	}
	p := (baseline - current) / (baseline - target) * 100
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}

// ── Challenges ───────────────────────────────────────────────────────────────

type challengeDef struct {
	Key         string
	Title       string
	Description string
	Points      int
}

var challengeDefs = []challengeDef{
	{
		Key:         "cut_10",
		Title:       "Cut your usage 10%",
		Description: "Use at least 10% less electricity this week than the week before.",
		Points:      60,
	},
	{
		Key:         "budget_safe",
		Title:       "Stay within your budget",
		Description: "Keep your current monthly spend at or under the budget you set in Energy Intelligence.",
		Points:      40,
	},
	{
		Key:         "off_peak",
		Title:       "Run big loads off-peak",
		Description: "Run the washing machine, iron or kettle between 9pm and 6am at least twice this week.",
		Points:      25,
	},
}

// ListChallenges returns the weekly challenges with the caller's status.
func (s *SavingsService) ListChallenges(userID string) ([]*model.Challenge, error) {
	ws := weekStart(time.Now())
	done, err := s.savingsRepo.UserChallengeKeys(userID, ws)
	if err != nil {
		return nil, err
	}
	doneSet := map[string]bool{}
	for _, k := range done {
		doneSet[k] = true
	}

	out := make([]*model.Challenge, 0, len(challengeDefs))
	for _, def := range challengeDefs {
		c := &model.Challenge{
			Key:         def.Key,
			Title:       def.Title,
			Description: def.Description,
			Points:      def.Points,
			Achieved:    doneSet[def.Key],
			Status:      "open",
		}
		if c.Achieved {
			c.Status = "done"
		}
		out = append(out, c)
	}
	return out, nil
}

// ClaimChallenge verifies (or accepts) a weekly challenge and awards its points.
func (s *SavingsService) ClaimChallenge(userID, key string) (*model.Challenge, error) {
	var def *challengeDef
	for i := range challengeDefs {
		if challengeDefs[i].Key == key {
			def = &challengeDefs[i]
			break
		}
	}
	if def == nil {
		return nil, fmt.Errorf("%w: unknown challenge", ErrInvalid)
	}

	ws := weekStart(time.Now())
	claimed, err := s.savingsRepo.HasChallengeClaim(userID, key, ws)
	if err != nil {
		return nil, err
	}
	if claimed {
		return nil, fmt.Errorf("%w: you already claimed this challenge this week", ErrInvalid)
	}

	challenge := &model.Challenge{
		Key:         def.Key,
		Title:       def.Title,
		Description: def.Description,
		Points:      def.Points,
		Achieved:    false,
		Status:      "open",
	}

	meter, err := s.primaryMeter(userID)
	if err != nil {
		return nil, err
	}
	usage, err := s.usageSvc.SummarizeMeter(meter)
	if err != nil {
		return nil, err
	}

	switch key {
	case "cut_10":
		last, prev := weekSums(usage.Daily)
		switch {
		case prev <= 0:
			challenge.Status = "no_data"
			challenge.Message = "We need two weeks of readings to verify this. Connect your meter or record readings."
			return challenge, nil
		case last < prev*0.90:
			challenge.Achieved = true
			challenge.Status = "done"
			challenge.Message = fmt.Sprintf("Usage dropped from %s to %s kWh — nicely done.", trimFloat(prev), trimFloat(last))
		default:
			challenge.Status = "open"
			challenge.Message = fmt.Sprintf("Usage was %s kWh this week vs %s kWh before — keep going to hit the 10%% cut.", trimFloat(last), trimFloat(prev))
			return challenge, nil
		}

	case "budget_safe":
		budget, _ := s.energyRepo.GetBudgetByMeter(meter.ID)
		if budget == nil {
			challenge.Status = "no_budget"
			challenge.Message = "Set a monthly budget in Energy Intelligence first, then come back to claim this."
			return challenge, nil
		}
		if usage.MonthCostKsh <= budget.MonthlyBudgetKsh {
			challenge.Achieved = true
			challenge.Status = "done"
			challenge.Message = fmt.Sprintf("You are at %s against a %s/month budget.", fmtKshPlain(usage.MonthCostKsh), fmtKshPlain(budget.MonthlyBudgetKsh))
		} else {
			challenge.Status = "open"
			challenge.Message = fmt.Sprintf("You are at %s against a %s budget — trim a little more.", fmtKshPlain(usage.MonthCostKsh), fmtKshPlain(budget.MonthlyBudgetKsh))
			return challenge, nil
		}

	case "off_peak":
		challenge.Achieved = true
		challenge.Status = "done"
		challenge.Message = "Great habit — off-peak power costs less."
	}

	if challenge.Achieved {
		if err := s.savingsRepo.AddChallengePoints(userID, key, ws, def.Points); err != nil {
			// Unique constraint hit means someone else claimed in a race.
			return nil, fmt.Errorf("%w: already claimed", ErrInvalid)
		}
	}
	return challenge, nil
}

// Leaderboard returns the top scorers and the caller's standing.
func (s *SavingsService) Leaderboard(userID string) (*model.LeaderboardResponse, error) {
	rows, err := s.savingsRepo.TopChallengeUsers(20)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []*model.LeaderboardRow{}
	}

	myPoints, myClaims, err := s.savingsRepo.UserTotals(userID)
	if err != nil {
		return nil, err
	}

	resp := &model.LeaderboardResponse{
		Rows:     rows,
		MyName:   "You",
		MyPoints: myPoints,
		MyClaims: myClaims,
		MyRank:   len(rows) + 1, // below the visible top 20 by default
	}

	if u, err := s.userRepo.GetByID(userID); err == nil {
		resp.MyName = u.Name
	}

	// Top 20 is ordered desc; find the position my points slot into.
	for i, row := range rows {
		if row.Points <= myPoints {
			resp.MyRank = i + 1
			break
		}
	}
	if myPoints == 0 {
		resp.MyRank = len(rows) + 1
	}

	return resp, nil
}

// Carbon estimates the caller's electricity footprint on their primary meter.
func (s *SavingsService) Carbon(userID string) (*model.CarbonSummary, error) {
	meter, err := s.primaryMeter(userID)
	if err != nil {
		return nil, err
	}
	usage, err := s.usageSvc.SummarizeMeter(meter)
	if err != nil {
		return nil, err
	}

	monthKg := usage.MonthKwh * CarbonKgPerKwh
	return &model.CarbonSummary{
		FactorKgPerKwh: CarbonKgPerKwh,
		TodayKg:        round2(usage.TodayKwh * CarbonKgPerKwh),
		WeekKg:         round2(usage.WeekKwh * CarbonKgPerKwh),
		MonthKg:        round2(monthKg),
		TreesMonthly:   round2(monthKg / KgPerTreePerMonth),
	}, nil
}
