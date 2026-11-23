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

const customQueryColumns = `id, ref, name, namespace, chart, created_at, updated_at`

func (s *Store) CreateCustomQuery(
	ctx context.Context,
	query entity.CustomQuery,
) (entity.CustomQuery, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CreateCustomQuery")
	defer endSpan()

	now := time.Now().UTC()
	query.Ref = uuid.New()
	query.CreatedAt = now
	query.UpdatedAt = now

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO custom_queries (ref, name, namespace, chart, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		query.Ref,
		query.Name,
		query.Namespace,
		query.Chart,
		now.Format(constant.TimestampLayout),
		now.Format(constant.TimestampLayout),
	)
	if err != nil {
		return entity.CustomQuery{}, fmt.Errorf("create custom query %q: %w", query.Name, err)
	}

	if query.ID, err = res.LastInsertId(); err != nil {
		return entity.CustomQuery{}, fmt.Errorf("custom query id: %w", err)
	}

	return query, nil
}

func (s *Store) CustomQueryByRef(
	ctx context.Context,
	ref string,
) (entity.CustomQuery, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.CustomQueryByRef")
	defer endSpan()

	row := s.db.QueryRowContext(ctx,
		`SELECT `+customQueryColumns+` FROM custom_queries WHERE ref = ?`, ref)

	query, err := scanCustomQueryRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.CustomQuery{}, false, nil
	}

	if err != nil {
		return entity.CustomQuery{}, false, fmt.Errorf("custom query %q: %w", ref, err)
	}

	return query, true, nil
}

func (s *Store) UpdateCustomQuery(
	ctx context.Context,
	query entity.CustomQuery,
) (entity.CustomQuery, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.UpdateCustomQuery")
	defer endSpan()

	query.UpdatedAt = time.Now().UTC()

	if _, err := s.db.ExecContext(ctx, `
		UPDATE custom_queries SET name = ?, chart = ?, updated_at = ? WHERE ref = ?`,
		query.Name,
		query.Chart,
		query.UpdatedAt.Format(constant.TimestampLayout),
		query.Ref,
	); err != nil {
		return entity.CustomQuery{}, fmt.Errorf("update custom query %q: %w", query.Ref, err)
	}

	return query, nil
}

func scanCustomQueryRow(scanner interface{ Scan(dest ...any) error }) (entity.CustomQuery, error) {
	var (
		query      entity.CustomQuery
		createdRaw string
		updatedRaw string
	)

	if err := scanner.Scan(&query.ID, &query.Ref, &query.Name, &query.Namespace,
		&query.Chart, &createdRaw, &updatedRaw); err != nil {
		return entity.CustomQuery{}, err
	}

	var err error

	if query.CreatedAt, err = time.Parse(constant.TimestampLayout, createdRaw); err != nil {
		return entity.CustomQuery{}, fmt.Errorf("created_at %q: %w", createdRaw, err)
	}

	if query.UpdatedAt, err = time.Parse(constant.TimestampLayout, updatedRaw); err != nil {
		return entity.CustomQuery{}, fmt.Errorf("updated_at %q: %w", updatedRaw, err)
	}

	return query, nil
}

func (s *Store) ListCustomQueries(ctx context.Context) ([]entity.CustomQuery, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.ListCustomQueries")
	defer endSpan()

	rows, err := s.db.QueryContext(ctx,
		`SELECT `+customQueryColumns+` FROM custom_queries ORDER BY ref`)
	if err != nil {
		return nil, fmt.Errorf("select custom queries: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var out []entity.CustomQuery

	for rows.Next() {
		query, scanErr := scanCustomQueryRow(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan custom query: %w", scanErr)
		}

		out = append(out, query)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate custom queries: %w", err)
	}

	return out, nil
}
