package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type CurrencyConfigRepository struct {
	db DBQuerier
}

func NewCurrencyConfigRepository(db DBQuerier) CurrencyConfigRepository {
	return CurrencyConfigRepository{db: db}
}

// GetBaseCurrency retrieves the immutable base currency code
// Returns error if config table is empty (should not happen if initialization succeeded)
func (r CurrencyConfigRepository) GetBaseCurrency(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var currencyCode string
	err := r.db.QueryRow(ctx, "SELECT currency_code FROM base_currency_config LIMIT 1").Scan(&currencyCode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", errors.New("base currency config not initialized (no row in base_currency_config table)")
		}
		return "", err
	}

	return currencyCode, nil
}

// GetBaseCurrencyWithTimestamp retrieves both the currency code and when it was set
func (r CurrencyConfigRepository) GetBaseCurrencyWithTimestamp(ctx context.Context) (currencyCode string, setAt time.Time, err error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err = r.db.QueryRow(ctx, "SELECT currency_code, set_at FROM base_currency_config LIMIT 1").Scan(&currencyCode, &setAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", time.Time{}, errors.New("base currency config not initialized")
		}
		return "", time.Time{}, err
	}

	return currencyCode, setAt, nil
}
