// Package rates keeps the reference rates the ledger converts with: it scrapes the
// source, stores what it read, and answers the rate for one pair on one day.
package rates

import (
	"context"
	"fmt"
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
	Rate(ctx context.Context, base, quote string, on time.Time) (entity.Rate, error)
}

type TimeSource interface{ Now() time.Time }

type Service struct {
	source repository.RateSource
	store  repository.RateStore
	clock  TimeSource
}

func New(source repository.RateSource, store repository.RateStore, clock TimeSource) *Service {
	return &Service{source: source, store: store, clock: clock}
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
) (entity.Rate, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Rates.Rate")
	defer endSpan()

	if on.IsZero() {
		on = s.clock.Now()
	}

	rate, found, err := s.store.RateOn(ctx, base, quote, on)
	if err != nil {
		return entity.Rate{}, err
	}

	if !found {
		return entity.Rate{}, fmt.Errorf("%w: no %s/%s rate on %s",
			entity.ErrNotFound, base, quote, on.Format(constant.DateLayout))
	}

	return rate, nil
}
