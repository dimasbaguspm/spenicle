package httpcmd

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
)

func Handler(ctx context.Context, process *config.Process) (http.Handler, error) {
	extractor, err := buildExtractor(ctx, process)
	if err != nil {
		return nil, err
	}

	store := process.Store

	return handlers.New(handlers.Deps{
		Ledger: process.Ledger,
		Captures: captures.New(
			store, process.Ledger, process.Sealer, extractor, clock.System{}, clock.System{},
		),
		Rates:             process.Rates,
		Accounts:          store,
		Payees:            store,
		Recurring:         store,
		Analytics:         store,
		CustomQueries:     store,
		Settings:          process.Settings,
		Health:            store,
		Sealer:            process.Sealer,
		BaseCurrency:      process.BaseCurrency,
		Version:           config.Version,
		HealthTimeout:     process.Cfg.HealthTimeout,
		MaxBodyBytes:      process.Cfg.MaxBodyBytes,
		WebOrigin:         process.Cfg.WebOrigin,
		ExtractionEnabled: process.Cfg.SnapToJSONAPIKey != "",
		Logger:            process.Logger,
	}), nil
}

func buildExtractor(ctx context.Context, process *config.Process) (extraction.Extractor, error) {
	rail, err := selectRail(ctx, process.Cfg, process.Logger)
	if err != nil {
		return nil, err
	}

	return rail, nil
}

func selectRail(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *slog.Logger,
) (extraction.Extractor, error) {
	if cfg.SnapToJSONAPIKey != "" {
		rail, err := snaptojson.New(cfg.SnapToJSONEndpoint, cfg.SnapToJSONAPIKey, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("snaptojson rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	if cfg.OpenAIAPIKey != "" {
		rail, err := openai.New(cfg.OpenAIAPIKey, cfg.OpenAIModel, "", cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("openai rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	logger.InfoContext(ctx, "no extraction rail configured: captures stay manual")

	return nil, nil //nolint:nilnil // nil extractor is the documented "disabled" mode
}
