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

	return s.rateWhere(ctx, base, quote, `AND on_date = ?`, on.Format(constant.DateLayout))
}

func (s *Store) RateOnOrBefore(
	ctx context.Context,
	base, quote string,
	on time.Time,
) (entity.Rate, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.RateOnOrBefore")
	defer endSpan()

	return s.rateWhere(ctx, base, quote,
		`AND on_date <= ? ORDER BY on_date DESC LIMIT 1`, on.Format(constant.DateLayout))
}

func (s *Store) rateWhere(
	ctx context.Context,
	base, quote, condition string,
	arg any,
) (entity.Rate, bool, error) {
	var (
		rate      entity.Rate
		onDate    string
		fetchedAt string
	)

	//nolint:gosec // G202: condition is one of two literals, never caller text
	query := `
		SELECT ref, base, quote, on_date, rate, source, fetched_at
		FROM fx_rates
		WHERE base = ? AND quote = ? ` + condition

	err := s.db.QueryRowContext(ctx, query, base, quote, arg).
		Scan(&rate.Ref, &rate.Base, &rate.Quote, &onDate, &rate.Rate, &rate.Source, &fetchedAt)
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

func (s *Store) ListRates(ctx context.Context) ([]entity.Rate, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListRates")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx, `
		SELECT ref, base, quote, on_date, rate, source, fetched_at
		FROM fx_rates ORDER BY on_date, base, quote`)
	if err != nil {
		return nil, fmt.Errorf("select rates: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.Rate

	for rows.Next() {
		var (
			rate      entity.Rate
			onDate    string
			fetchedAt string
		)

		if scanErr := rows.Scan(&rate.Ref, &rate.Base, &rate.Quote, &onDate,
			&rate.Rate, &rate.Source, &fetchedAt); scanErr != nil {
			return nil, fmt.Errorf("scan rate: %w", scanErr)
		}

		if rate.OnDate, err = time.Parse(constant.DateLayout, onDate); err != nil {
			return nil, fmt.Errorf("rate date %q: %w", onDate, err)
		}

		if rate.FetchedAt, err = time.Parse(constant.TimestampLayout, fetchedAt); err != nil {
			return nil, fmt.Errorf("rate timestamp %q: %w", fetchedAt, err)
		}

		out = append(out, rate)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rates: %w", err)
	}

	return out, nil
}
