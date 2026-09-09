package service

import (
	"fmt"
	"time"

	"powersmart-backend/model"
	"powersmart-backend/repositories"
)

// MarketplaceService surfaces the energy-saving catalogue and explains which
// products fit a user's home based on their Energy Intelligence data.
type MarketplaceService struct {
	marketRepo *repositories.MarketplaceRepo
	meterRepo  *repositories.MeterRepo
	energyRepo *repositories.EnergyRepo
	usageSvc   *UsageService
}

func NewMarketplaceService(
	marketRepo *repositories.MarketplaceRepo,
	meterRepo *repositories.MeterRepo,
	energyRepo *repositories.EnergyRepo,
	usageSvc *UsageService,
) *MarketplaceService {
	return &MarketplaceService{
		marketRepo: marketRepo,
		meterRepo:  meterRepo,
		energyRepo: energyRepo,
		usageSvc:   usageSvc,
	}
}

// Browse returns the catalogue plus personalised recommendations.
func (s *MarketplaceService) Browse(userID string) (*model.MarketplaceBrowse, error) {
	products, err := s.marketRepo.ListActive()
	if err != nil {
		return nil, err
	}
	if products == nil {
		products = []*model.MarketplaceProduct{}
	}

	out := &model.MarketplaceBrowse{
		Products:        products,
		Recommendations: []*model.MarketplaceRecommendation{},
		GeneratedAt:     time.Now(),
	}

	recs := s.recommend(userID, products)
	out.Recommendations = recs
	return out, nil
}

// recommend inspects the user's primary meter (appliances + usage) and returns
// product recommendations with human-readable reasons, best match first.
func (s *MarketplaceService) recommend(userID string, products []*model.MarketplaceProduct) []*model.MarketplaceRecommendation {
	byID := map[string]*model.MarketplaceProduct{}
	for _, p := range products {
		byID[p.ID] = p
	}

	meter, err := s.meterRepo.GetByUserID(userID)
	if err != nil {
		return nil
	}
	usage, err := s.usageSvc.SummarizeMeter(meter)
	if err != nil || usage == nil {
		return nil
	}
	appliances, _ := s.energyRepo.ListAppliances(meter.ID)

	// Appliance estimates (mirrors Energy Intelligence).
	monthlyCostByApp := map[string]float64{}
	shareByApp := map[string]float64{}
	var top *model.EnergyAppliance
	for _, a := range appliances {
		daily := (a.Watts * a.HoursPerDay) / 1000
		monthly := daily * DaysPerMonth
		monthlyCost := monthly * AssumedTariffKsh
		monthlyCostByApp[a.ID] = monthlyCost
		if usage.MonthKwh > 0 {
			shareByApp[a.ID] = monthly / usage.MonthKwh * 100
		}
		if top == nil || monthlyCost > monthlyCostByApp[top.ID] {
			top = a
		}
	}

	var recs []*model.MarketplaceRecommendation

	// A water-heating appliance dominates → solar water heater / heat pump.
	if top != nil {
		share := shareByApp[top.ID]
		cost := monthlyCostByApp[top.ID]
		isWaterHeat := nameHintsWater(top.Name)
		if isWaterHeat && share >= 15 {
			if p := byID["prod-swh"]; p != nil {
				recs = append(recs, &model.MarketplaceRecommendation{
					Product: p,
					Basis:   "appliance",
					Reason: fmt.Sprintf(
						"Your %s accounts for about %.0f%% of your estimated usage (~%s/month). A solar water heater could remove most of that demand.",
						top.Name, share, fmtKshPlain(cost),
					),
				})
			} else if p := byID["prod-heatpump"]; p != nil {
				recs = append(recs, &model.MarketplaceRecommendation{
					Product: p,
					Basis:   "appliance",
					Reason:  fmt.Sprintf("Your %s is one of your biggest loads — a heat-pump water heater uses ~60%% less power.", top.Name),
				})
			}
		}
	}

	// High spend or heavy usage → solar kit / panels.
	if usage.MonthCostKsh >= 1500 || usage.DailyAvgKwh >= 15 {
		if p := byID["prod-solar-2kw"]; p != nil {
			recs = append(recs, &model.MarketplaceRecommendation{
				Product: p,
				Basis:   "spend",
				Reason: fmt.Sprintf(
					"You're spending about %s/month on electricity. Generating your own daytime power could cut that noticeably.",
					fmtKshPlain(usage.MonthCostKsh),
				),
			})
		}
	}

	// Any meaningful usage → LED + smart monitoring quick wins.
	if usage.MonthCostKsh >= 800 {
		if p := byID["prod-led"]; p != nil {
			recs = append(recs, &model.MarketplaceRecommendation{
				Product: p,
				Basis:   "efficiency",
				Reason:  "Lighting runs for hours every day — switching to LEDs is the fastest, cheapest win in any home.",
			})
		}
		if p := byID["prod-smartplug"]; p != nil {
			recs = append(recs, &model.MarketplaceRecommendation{
				Product: p,
				Basis:   "efficiency",
				Reason:  "Smart plugs show exactly what each appliance draws, so you stop paying for standby and hidden loads.",
			})
		}
	}

	// Cap at three recommendations.
	if len(recs) > 3 {
		recs = recs[:3]
	}
	return recs
}
