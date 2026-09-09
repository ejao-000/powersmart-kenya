package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
	"powersmart-backend/utils"
)

// PoolError values used to surface clearer HTTP responses.
var (
	ErrPoolInsufficient = errors.New("pool balance is too low for that purchase")
	ErrPoolOwnerFixed   = errors.New("the pool owner cannot be changed or removed")
)

const inviteCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no confusing 0/O/1/I

// PoolService powers the shared "Power Pool" electricity wallet:
//
//   - A pool is tied to one meter the creator owns (families / housemates share
//     that meter). Members join by invite code and contribute money to the pool.
//   - Authorised members buy tokens from the pooled balance for the shared meter;
//     every contribution and purchase is recorded in a per-pool ledger.
//   - Roles gate permissions: owner/admin manage members; members may buy when
//     can_buy is enabled.
type PoolService struct {
	poolRepo  *repositories.PoolRepo
	meterRepo *repositories.MeterRepo
	userRepo  *repositories.UserRepo
	tokenSvc  *TokenService
}

func NewPoolService(
	poolRepo *repositories.PoolRepo,
	meterRepo *repositories.MeterRepo,
	userRepo *repositories.UserRepo,
	tokenSvc *TokenService,
) *PoolService {
	return &PoolService{
		poolRepo:  poolRepo,
		meterRepo: meterRepo,
		userRepo:  userRepo,
		tokenSvc:  tokenSvc,
	}
}

func poolMeterName(m *model.Meter) string {
	if m != nil {
		if strings.TrimSpace(m.Name) != "" {
			return m.Name
		}
		if m.MeterNumber != "" {
			return m.MeterNumber
		}
	}
	return "Shared meter"
}

// membership returns the caller's membership and a typed error when missing.
func (s *PoolService) membership(poolID, userID string) (*model.PoolMember, error) {
	m, err := s.poolRepo.GetMember(poolID, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, fmt.Errorf("%w: you are not a member of this pool", ErrForbidden)
		}
		return nil, err
	}
	return m, nil
}

func (s *PoolService) canManage(m *model.PoolMember) bool {
	return m.Role == model.PoolRoleOwner || m.Role == model.PoolRoleAdmin
}

func (s *PoolService) canBuyTokens(m *model.PoolMember) bool {
	if s.canManage(m) {
		return true
	}
	return m.CanBuy
}

// CreatePool creates a pool around one of the caller's meters and makes them owner.
func (s *PoolService) CreatePool(userID string, req *model.CreatePoolRequest) (*model.PoolSummary, error) {
	name := strings.TrimSpace(req.Name)
	if len(name) < 2 || len(name) > 60 {
		return nil, fmt.Errorf("%w: pool name must be between 2 and 60 characters", ErrInvalid)
	}
	if req.MeterID == "" {
		return nil, fmt.Errorf("%w: a meter is required for a power pool", ErrInvalid)
	}

	meter, err := s.meterRepo.GetByIDForUser(req.MeterID, userID)
	if err != nil {
		return nil, fmt.Errorf("%w: meter not found for this account", ErrInvalid)
	}

	code, err := newInviteCode()
	if err != nil {
		return nil, err
	}

	pool := &model.PowerPool{
		ID:         uuid.NewString(),
		MeterID:    meter.ID,
		Name:       name,
		InviteCode: code,
		CreatedBy:  userID,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if err := s.poolRepo.CreatePool(pool); err != nil {
		return nil, err
	}

	owner := &model.PoolMember{
		ID:        uuid.NewString(),
		PoolID:    pool.ID,
		UserID:    userID,
		Role:      model.PoolRoleOwner,
		CanBuy:    true,
		CanInvite: true,
		JoinedAt:  time.Now(),
	}
	if err := s.poolRepo.CreateMember(owner); err != nil {
		return nil, err
	}

	return s.Summary(pool, owner)
}

// ListPools returns every pool the user belongs to.
func (s *PoolService) ListPools(userID string) ([]*model.PoolSummary, error) {
	ids, err := s.poolRepo.PoolIDsForUser(userID)
	if err != nil {
		return nil, err
	}

	out := []*model.PoolSummary{}
	for _, id := range ids {
		pool, err := s.poolRepo.GetPoolByID(id)
		if err != nil {
			continue
		}
		me, err := s.poolRepo.GetMember(pool.ID, userID)
		if err != nil {
			continue
		}
		sum, err := s.Summary(pool, me)
		if err != nil {
			continue
		}
		out = append(out, sum)
	}
	return out, nil
}

// Summary builds the lightweight pool view for list screens.
func (s *PoolService) Summary(pool *model.PowerPool, me *model.PoolMember) (*model.PoolSummary, error) {
	totals, err := s.poolRepo.Totals(pool.ID)
	if err != nil {
		return nil, err
	}
	count, err := s.poolRepo.CountMembers(pool.ID)
	if err != nil {
		return nil, err
	}
	meter, _ := s.meterRepo.GetByID(pool.MeterID)

	return &model.PoolSummary{
		ID:               pool.ID,
		Name:             pool.Name,
		MeterID:          pool.MeterID,
		MeterName:        poolMeterName(meter),
		InviteCode:       pool.InviteCode,
		MyRole:           me.Role,
		MyCanBuy:         s.canBuyTokens(me),
		MyCanInvite:      s.canManage(me),
		BalanceKsh:       totals.ContributionsKsh - totals.SpentKsh,
		ContributionsKsh: totals.ContributionsKsh,
		SpentKsh:         totals.SpentKsh,
		MemberCount:      count,
		CreatedAt:        pool.CreatedAt,
	}, nil
}

// Detail returns the full pool payload (members + merged activity feed).
func (s *PoolService) Detail(userID, poolID string) (*model.PoolDetail, error) {
	pool, err := s.poolRepo.GetPoolByID(poolID)
	if err != nil {
		return nil, err
	}
	me, err := s.membership(poolID, userID)
	if err != nil {
		return nil, err
	}

	sum, err := s.Summary(pool, me)
	if err != nil {
		return nil, err
	}

	members, err := s.poolRepo.ListMembers(poolID)
	if err != nil {
		return nil, err
	}
	if members == nil {
		members = []*model.PoolMember{}
	}

	contribs, _ := s.poolRepo.ListContributions(poolID)
	expenses, _ := s.poolRepo.ListExpenses(poolID)

	activity := []*model.PoolActivity{}
	if contribs == nil {
		contribs = []*model.PoolContribution{}
	}
	if expenses == nil {
		expenses = []*model.PoolExpense{}
	}
	for _, c := range contribs {
		activity = append(activity, &model.PoolActivity{
			Kind:      "contribution",
			ID:        c.ID,
			UserName:  c.UserName,
			AmountKsh: c.AmountKsh,
			Channel:   c.Channel,
			Note:      c.Note,
			CreatedAt: c.CreatedAt,
		})
	}
	for _, e := range expenses {
		activity = append(activity, &model.PoolActivity{
			Kind:        "expense",
			ID:          e.ID,
			UserName:    e.UserName,
			AmountKsh:   e.AmountKsh,
			TokenNumber: e.TokenNumber,
			TokenUnits:  e.TokenUnits,
			CreatedAt:   e.CreatedAt,
		})
	}
	sort.SliceStable(activity, func(i, j int) bool {
		return activity[i].CreatedAt.After(activity[j].CreatedAt)
	})
	if len(activity) > 30 {
		activity = activity[:30]
	}

	return &model.PoolDetail{
		ID:               sum.ID,
		Name:             sum.Name,
		MeterID:          sum.MeterID,
		MeterName:        sum.MeterName,
		InviteCode:       sum.InviteCode,
		MyRole:           sum.MyRole,
		MyCanBuy:         sum.MyCanBuy,
		MyCanInvite:      sum.MyCanInvite,
		BalanceKsh:       sum.BalanceKsh,
		ContributionsKsh: sum.ContributionsKsh,
		SpentKsh:         sum.SpentKsh,
		Members:          members,
		Activity:         activity,
		CreatedAt:        pool.CreatedAt,
	}, nil
}

// Join lets a registered user join a pool with its invite code.
func (s *PoolService) Join(userID, inviteCode string) (*model.PoolDetail, error) {
	code := strings.ToUpper(strings.TrimSpace(inviteCode))
	if code == "" {
		return nil, fmt.Errorf("%w: an invite code is required", ErrInvalid)
	}
	pool, err := s.poolRepo.GetPoolByInvite(code)
	if err != nil {
		return nil, fmt.Errorf("%w: invite code not recognised", ErrInvalid)
	}

	existing, err := s.poolRepo.GetMember(pool.ID, userID)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("%w: you are already a member of this pool", ErrInvalid)
	}

	member := &model.PoolMember{
		ID:        uuid.NewString(),
		PoolID:    pool.ID,
		UserID:    userID,
		Role:      model.PoolRoleMember,
		CanBuy:    true,
		CanInvite: false,
		JoinedAt:  time.Now(),
	}
	if err := s.poolRepo.CreateMember(member); err != nil {
		return nil, err
	}
	return s.Detail(userID, pool.ID)
}

// AddMember lets an owner/admin add a registered user to the pool by email.
func (s *PoolService) AddMember(actorID, poolID string, req *model.AddPoolMemberRequest) (*model.PoolMember, error) {
	actor, err := s.membership(poolID, actorID)
	if err != nil {
		return nil, err
	}
	if !s.canManage(actor) {
		return nil, fmt.Errorf("%w: only the pool owner or an admin can add members", ErrForbidden)
	}

	email := utils.NormaliseEmail(req.Email)
	if !utils.ValidEmail(email) {
		return nil, fmt.Errorf("%w: provide a valid email address", ErrInvalid)
	}
	target, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("%w: no PowerSmart account found for that email", ErrInvalid)
	}

	if _, err := s.poolRepo.GetMember(poolID, target.ID); err == nil {
		return nil, fmt.Errorf("%w: that user is already a member", ErrInvalid)
	}

	canBuy := true
	canInvite := false
	if req.CanBuy != nil {
		canBuy = *req.CanBuy
	}
	if req.CanInvite != nil {
		canInvite = *req.CanInvite
	}

	member := &model.PoolMember{
		ID:        uuid.NewString(),
		PoolID:    poolID,
		UserID:    target.ID,
		Role:      model.PoolRoleMember,
		CanBuy:    canBuy,
		CanInvite: canInvite,
		JoinedAt:  time.Now(),
		Name:      target.Name,
	}
	if err := s.poolRepo.CreateMember(member); err != nil {
		return nil, err
	}
	return member, nil
}

// UpdateMember lets an owner/admin change a member's role or buy permission.
func (s *PoolService) UpdateMember(actorID, poolID, memberID string, req *model.UpdatePoolMemberRequest) (*model.PoolMember, error) {
	actor, err := s.membership(poolID, actorID)
	if err != nil {
		return nil, err
	}
	if !s.canManage(actor) {
		return nil, fmt.Errorf("%w: only the pool owner or an admin can change member permissions", ErrForbidden)
	}

	target, err := s.poolRepo.GetMemberByID(memberID)
	if err != nil {
		return nil, repositories.ErrNotFound
	}
	if target.PoolID != poolID {
		return nil, fmt.Errorf("%w: member does not belong to this pool", ErrInvalid)
	}
	if target.Role == model.PoolRoleOwner {
		return nil, ErrPoolOwnerFixed
	}

	if req.Role != nil {
		switch model.PoolRole(*req.Role) {
		case model.PoolRoleAdmin:
			target.Role = model.PoolRoleAdmin
			target.CanInvite = true
			target.CanBuy = true
		case model.PoolRoleMember:
			target.Role = model.PoolRoleMember
			target.CanInvite = false
		default:
			return nil, fmt.Errorf("%w: role must be 'admin' or 'member'", ErrInvalid)
		}
	}
	if req.CanBuy != nil {
		target.CanBuy = *req.CanBuy
	}
	if req.CanInvite != nil && target.Role == model.PoolRoleMember {
		target.CanInvite = *req.CanInvite
	}

	if err := s.poolRepo.UpdateMember(target); err != nil {
		return nil, err
	}
	target.Name = ""

	// Reload contributed total for the response.
	members, err := s.poolRepo.ListMembers(poolID)
	if err == nil {
		for _, m := range members {
			if m.ID == target.ID {
				target.ContributedKsh = m.ContributedKsh
				target.Name = m.Name
				break
			}
		}
	}
	return target, nil
}

// RemoveMember lets an owner/admin remove another non-owner member, or a member
// leave the pool themselves.
func (s *PoolService) RemoveMember(actorID, poolID, memberID string) error {
	target, err := s.poolRepo.GetMemberByID(memberID)
	if err != nil {
		return repositories.ErrNotFound
	}
	if target.PoolID != poolID {
		return fmt.Errorf("%w: member does not belong to this pool", ErrInvalid)
	}
	if target.Role == model.PoolRoleOwner {
		return ErrPoolOwnerFixed
	}

	actor, err := s.membership(poolID, actorID)
	if err != nil {
		return err
	}

	if actor.ID == target.ID {
		// Member leaving on their own is always allowed.
		return s.poolRepo.DeleteMember(poolID, target.UserID)
	}
	if !s.canManage(actor) {
		return fmt.Errorf("%w: only the pool owner or an admin can remove members", ErrForbidden)
	}
	return s.poolRepo.DeleteMember(poolID, target.UserID)
}

// Contribute records money added to the pool wallet.
func (s *PoolService) Contribute(userID, poolID string, req *model.AddPoolContributionRequest) (*model.PoolContribution, error) {
	if _, err := s.membership(poolID, userID); err != nil {
		return nil, err
	}

	if req.AmountKsh < 20 || req.AmountKsh > 200_000 {
		return nil, fmt.Errorf("%w: contribution must be between KSh 20 and KSh 200,000", ErrInvalid)
	}
	channel := strings.ToLower(strings.TrimSpace(req.Channel))
	if channel == "" {
		channel = "mpesa"
	}
	switch channel {
	case "mpesa", "airtel", "bank", "manual":
	default:
		return nil, fmt.Errorf("%w: channel must be mpesa, airtel, bank or manual", ErrInvalid)
	}

	c := &model.PoolContribution{
		ID:        uuid.NewString(),
		PoolID:    poolID,
		UserID:    userID,
		AmountKsh: req.AmountKsh,
		Channel:   channel,
		Note:      strings.TrimSpace(req.Note),
		CreatedAt: time.Now(),
	}
	if err := s.poolRepo.CreateContribution(c); err != nil {
		return nil, err
	}

	// Attach the contributor's name for display.
	if target, err := s.userRepo.GetByID(userID); err == nil {
		c.UserName = target.Name
	}
	return c, nil
}

// Purchase uses the pool balance to buy a token for the pool's meter. Requires
// buy permission (owner/admin always; members only when can_buy is set).
func (s *PoolService) Purchase(userID, poolID string, amountKsh int) (*model.PoolPurchaseResult, error) {
	if amountKsh < 50 || amountKsh > 200_000 {
		return nil, fmt.Errorf("%w: purchase must be between KSh 50 and KSh 200,000", ErrInvalid)
	}

	member, err := s.membership(poolID, userID)
	if err != nil {
		return nil, err
	}
	if !s.canBuyTokens(member) {
		return nil, fmt.Errorf("%w: you do not have permission to buy tokens with this pool", ErrForbidden)
	}

	pool, err := s.poolRepo.GetPoolByID(poolID)
	if err != nil {
		return nil, err
	}

	totals, err := s.poolRepo.Totals(poolID)
	if err != nil {
		return nil, err
	}
	balance := totals.ContributionsKsh - totals.SpentKsh
	if balance < amountKsh {
		return nil, ErrPoolInsufficient
	}

	// Issue and persist the token against the pool's shared meter.
	ref := fmt.Sprintf("POOL-%s", uuid.NewString()[:8])
	token, err := s.tokenSvc.BuyTokenForPool(userID, pool.MeterID, amountKsh, ref)
	if err != nil {
		return nil, err
	}

	expense := &model.PoolExpense{
		ID:          uuid.NewString(),
		PoolID:      poolID,
		UserID:      userID,
		TokenID:     token.ID,
		AmountKsh:   amountKsh,
		Description: fmt.Sprintf("Token purchase on %s", s.meterLabelOrEmpty(pool)),
		CreatedAt:   time.Now(),
	}
	if err := s.poolRepo.CreateExpense(expense); err != nil {
		return nil, err
	}

	if target, err := s.userRepo.GetByID(userID); err == nil {
		expense.UserName = target.Name
	}
	expense.TokenNumber = token.TokenNumber
	expense.TokenUnits = token.Units

	return &model.PoolPurchaseResult{
		Expense:    expense,
		Token:      token,
		BalanceKsh: balance - amountKsh,
	}, nil
}

func (s *PoolService) meterLabelOrEmpty(p *model.PowerPool) string {
	meter, err := s.meterRepo.GetByID(p.MeterID)
	if err != nil {
		return "the shared meter"
	}
	return poolMeterName(meter)
}

// newInviteCode returns a collision-resistant 8 character invite code.
func newInviteCode() (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, 8)
	for i, b := range buf {
		out[i] = inviteCodeAlphabet[int(b)%len(inviteCodeAlphabet)]
	}
	return string(out), nil
}
