// Package rates keeps the reference rates the ledger converts with: it scrapes the
// source, stores what it read, and answers the rate for one pair on one day.
package rates

import (
	"context"
	"sync"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Report struct {
	OnDate time.Time
	Source string
	Stored int
}

type Contract interface {
	Refresh(ctx context.Context) (Report, error)
	Rate(ctx context.Context, base, quote string, on time.Time) (entity.Rate, bool, error)
}

type TimeSource interface{ Now() time.Time }

type Service struct {
	source repository.RateSource
	store  repository.RateStore
	clock  TimeSource

	mu    sync.RWMutex
	cache map[string]entity.Rate
}

func New(source repository.RateSource, store repository.RateStore, clock TimeSource) *Service {
	return &Service{
		source: source,
		store:  store,
		clock:  clock,
		cache:  make(map[string]entity.Rate),
	}
}

var _ Contract = (*Service)(nil)

func (s *Service) Refresh(ctx context.Context) (Report, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Rates.Refresh")
	defer endSpan()

	rates, err := s.source.Daily(ctx)
	if err != nil {
		return Report{}, err
	}

	if err := s.store.SaveRates(ctx, rates); err != nil {
		return Report{}, err
	}

	s.remember(s.stored(ctx, rates))

	report := Report{Source: constant.FXSourceECB, Stored: len(rates)}
	if len(rates) > 0 {
		report.OnDate = rates[0].OnDate
	}

	return report, nil
}

func (s *Service) Rate(
	ctx context.Context,
	base, quote string,
	on time.Time,
) (entity.Rate, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Rates.Rate")
	defer endSpan()

	if on.IsZero() {
		on = s.clock.Now()
	}

	if cached, ok := s.cached(base, quote, on); ok {
		return cached, true, nil
	}

	rate, found, err := s.store.RateOnOrBefore(ctx, base, quote, on)
	if err != nil {
		return entity.Rate{}, false, err
	}

	if !found {
		return entity.Rate{}, false, nil
	}

	if rate.OnDate.Format(constant.DateLayout) != on.Format(constant.DateLayout) {
		rate.Source = constant.FXSourceCached
	}

	s.remember([]entity.Rate{rate})

	return rate, true, nil
}

func (s *Service) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.cache = make(map[string]entity.Rate)
}

func (s *Service) stored(ctx context.Context, rates []entity.Rate) []entity.Rate {
	saved := make([]entity.Rate, 0, len(rates))

	for _, rate := range rates {
		row, found, err := s.store.RateOn(ctx, rate.Base, rate.Quote, rate.OnDate)
		if err != nil || !found {
			saved = append(saved, rate)

			continue
		}

		saved = append(saved, row)
	}

	return saved
}

func (s *Service) remember(rates []entity.Rate) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, rate := range rates {
		s.cache[rateKey(rate.Base, rate.Quote, rate.OnDate)] = rate
	}
}

func (s *Service) cached(base, quote string, on time.Time) (entity.Rate, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rate, ok := s.cache[rateKey(base, quote, on)]

	return rate, ok
}

func rateKey(base, quote string, on time.Time) string {
	return base + "/" + quote + "/" + on.Format(constant.DateLayout)
}
