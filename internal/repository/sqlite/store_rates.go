package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/uuid"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func (s *Store) SaveRates(ctx context.Context, rates []entity.Rate) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.SaveRates")
	defer endSpan()

	if len(rates) == 0 {
		return nil
	}

	return s.WithTx(ctx, func(ctx context.Context, tx *sql.Tx) error {
		for _, rate := range rates {
			ref := rate.Ref
			if ref == "" {
				ref = uuid.New()
			}

			if _, err := tx.ExecContext(ctx, `
				INSERT INTO fx_rates (ref, base, quote, on_date, rate, source, fetched_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (base, quote, on_date) DO UPDATE SET
					rate = excluded.rate,
					source = excluded.source,
					fetched_at = excluded.fetched_at`,
				ref,
				rate.Base,
				rate.Quote,
				rate.OnDate.Format(constant.DateLayout),
				rate.Rate,
				rate.Source,
				rate.FetchedAt.Format(constant.TimestampLayout),
			); err != nil {
				return fmt.Errorf("save rate %s/%s: %w", rate.Base, rate.Quote, err)
			}
		}

		return nil
	})
}

func (s *Store) RateOn(
	ctx context.Context,
	base, quote string,
	on time.Time,
) (entity.Rate, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RateOn")
	defer endSpan()

	var (
		rate      entity.Rate
		onDate    string
		fetchedAt string
	)

	err := s.db.QueryRowContext(ctx, `
		SELECT ref, base, quote, on_date, rate, source, fetched_at
		FROM fx_rates
		WHERE base = ? AND quote = ? AND on_date = ?`,
		base, quote, on.Format(constant.DateLayout),
	).Scan(&rate.Ref, &rate.Base, &rate.Quote, &onDate, &rate.Rate, &rate.Source, &fetchedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Rate{}, false, nil
	}

	if err != nil {
		return entity.Rate{}, false, fmt.Errorf("read rate %s/%s: %w", base, quote, err)
	}

	parsedOn, err := time.Parse(constant.DateLayout, onDate)
	if err != nil {
		return entity.Rate{}, false, fmt.Errorf("rate date %q: %w", onDate, err)
	}

	parsedAt, err := time.Parse(constant.TimestampLayout, fetchedAt)
	if err != nil {
		return entity.Rate{}, false, fmt.Errorf("rate timestamp %q: %w", fetchedAt, err)
	}

	rate.OnDate = parsedOn
	rate.FetchedAt = parsedAt

	return rate, true, nil
}
