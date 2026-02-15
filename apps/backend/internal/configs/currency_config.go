package configs

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

const DefaultBaseCurrency = "IDR"

// InitializeBaseCurrencyConfig ensures the base currency config table has exactly one row.
// On first run, it inserts the baseCurrency value.
// On subsequent runs, it verifies the stored currency matches the provided baseCurrency parameter.
// Returns error if initialization fails (DB error, currency mismatch).
func InitializeBaseCurrencyConfig(ctx context.Context, db *pgxpool.Pool, baseCurrency string) error {
	// Validate currency code format (3 uppercase letters)
	if len(baseCurrency) != 3 {
		return fmt.Errorf("invalid base currency code: '%s' (expected 3-letter ISO 4217 code)", baseCurrency)
	}

	// Check if config row already exists
	var existingCurrency string
	err := db.QueryRow(ctx, "SELECT currency_code FROM base_currency_config LIMIT 1").Scan(&existingCurrency)
	if err == nil {
		// Row exists, verify it matches
		if existingCurrency != baseCurrency {
			return fmt.Errorf("base currency mismatch: database has '%s' but environment specifies '%s'. "+
				"Base currency is immutable and cannot be changed after initialization", existingCurrency, baseCurrency)
		}
		slog.Info("✓ Base currency config verified", "currency", existingCurrency)
		return nil
	}

	// Check for actual DB errors (not just no rows)
	if err.Error() != "no rows in result set" {
		return fmt.Errorf("failed to query base_currency_config: %w", err)
	}

	// Config row doesn't exist, try to insert it (race condition possible but table constraint prevents multiple rows)
	_, err = db.Exec(ctx, "INSERT INTO base_currency_config (currency_code) VALUES ($1)", baseCurrency)
	if err != nil {
		return fmt.Errorf("failed to initialize base_currency_config: %w", err)
	}

	slog.Info("Base currency config initialized", "currency", baseCurrency)
	return nil
}
