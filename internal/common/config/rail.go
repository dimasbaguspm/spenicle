package config

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
)

// SelectRail picks the extraction rail both commands share: SnapToJSON when its key is set,
// and no rail otherwise, which is the documented "captures stay manual". OpenAI is not a
// fallback on purpose: one vendor reads email, text and PDF, and one code path is easier to
// trust than two that answer differently.
//
//nolint:ireturn // the rail is the seam both commands consume
func SelectRail(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *logging.Logger,
) (extraction.Extractor, error) {
	if cfg.SnapToJSONAPIKey != "" {
		rail, err := snaptojson.New(cfg.SnapToJSONEndpoint, cfg.SnapToJSONAPIKey, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("snaptojson rail: %w", err)
		}

		logger.Info(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	logger.Info(ctx, "no extraction rail configured: captures stay manual")

	return nil, nil //nolint:nilnil // nil extractor is the documented "disabled" mode
}
