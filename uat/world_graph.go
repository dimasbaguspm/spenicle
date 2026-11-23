package uat

import (
	"context"
	"errors"
	"fmt"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/repository/ecb"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func bootRates(
	ctx context.Context,
	endpoint string,
	store *sqlite.Store,
	limits entity.AppConfig,
	clockSystem clock.System,
) (*rates.Service, error) {
	source, err := ecb.New(endpoint, limits.ECBTimeout, clockSystem)
	if err != nil {
		return nil, fmt.Errorf("ecb: %w", err)
	}

	service := rates.New(source, store, clockSystem)

	_, refreshErr := service.Refresh(ctx)

	return service, refreshErr
}

func (w *world) ratesTarget() string {
	return pickEndpoint(w.ratesFault,
		w.options.RatesEndpoint, w.options.RatesDownEndpoint, w.options.RatesBrokenEndpoint)
}

func pickEndpoint(fault faultType, healthy, down, broken string) string {
	switch fault {
	case faultDown:
		return down
	case faultBroken:
		return broken
	case faultNone:
		return healthy
	}

	return healthy
}

type dependencies struct {
	rates     rates.Contract
	cache     *rates.Service
	extractor extraction.Extractor
}

func (w *world) dependencies(
	ctx context.Context,
	store *sqlite.Store,
	limits entity.AppConfig,
	clockSystem clock.System,
) (dependencies, error) {
	var built dependencies

	if target := w.ratesTarget(); target != "" {
		service, ratesErr := bootRates(ctx, target, store, limits, clockSystem)
		if service == nil {
			return dependencies{}, fmt.Errorf("rates: %w", ratesErr)
		}

		built.rates = service
		built.cache = service
	}

	if w.rail == "" {
		return built, nil
	}

	extractor, err := w.newExtractor()
	if err != nil {
		return dependencies{}, err
	}

	built.extractor = extractor

	return built, nil
}

//nolint:ireturn // the two rails share only the Extractor contract; the caller wants no vendor type
func (w *world) newExtractor() (extraction.Extractor, error) {
	switch w.rail {
	case snaptojson.RailName:
		endpoint := pickEndpoint(w.extractionFault,
			w.options.SnapEndpoint, w.options.SnapDownEndpoint, w.options.SnapBrokenEndpoint)

		if endpoint == "" {
			return nil, errors.New("the snaptojson rail needs the mock service: run with Docker")
		}

		return snaptojson.New(endpoint, stubKey, vendorTimeout)
	case openai.RailName:
		base := pickEndpoint(w.extractionFault,
			w.options.OpenAIEndpoint, w.options.OpenAIDownEndpoint, w.options.OpenAIBrokenEndpoint)

		if base == "" {
			return nil, errors.New("the openai rail needs the mock service: run with Docker")
		}

		return openai.New(stubKey, stubModel, base, vendorTimeout)
	default:
		return nil, fmt.Errorf("unknown extraction rail %q", w.rail)
	}
}
