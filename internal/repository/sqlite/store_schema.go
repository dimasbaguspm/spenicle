package sqlite

import (
	"context"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/repository/schema"
)

func (s *Store) Tables(ctx context.Context) ([]schema.Table, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Sqlite.Tables")
	defer endSpan()

	names, err := s.tableNames(ctx)
	if err != nil {
		return nil, err
	}

	tables := make([]schema.Table, 0, len(names))

	for _, name := range names {
		table := schema.Table{Name: name}

		if err := s.readColumns(ctx, &table); err != nil {
			return nil, err
		}

		if err := s.readReferences(ctx, &table); err != nil {
			return nil, err
		}

		tables = append(tables, table)
	}

	return tables, nil
}

func (s *Store) tableNames(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT name FROM sqlite_master
		WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
		ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list tables: %w", err)
	}

	defer func() { _ = rows.Close() }()

	var names []string

	for rows.Next() {
		var name string

		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("scan table name: %w", err)
		}

		names = append(names, name)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tables: %w", err)
	}

	return names, nil
}

func (s *Store) readColumns(ctx context.Context, table *schema.Table) error {
	rows, err := s.db.QueryContext(ctx, `
		SELECT name, type, "notnull", COALESCE(dflt_value, ''), pk
		FROM pragma_table_info(?)`, table.Name)
	if err != nil {
		return fmt.Errorf("columns of %s: %w", table.Name, err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			column  schema.Column
			notNull int
			primary int
		)

		if err := rows.Scan(
			&column.Name,
			&column.Type,
			&notNull,
			&column.Default,
			&primary,
		); err != nil {
			return fmt.Errorf("scan column of %s: %w", table.Name, err)
		}

		column.NotNull = notNull == 1
		column.PrimaryKey = primary > 0

		table.Columns = append(table.Columns, column)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate columns of %s: %w", table.Name, err)
	}

	return nil
}

func (s *Store) readReferences(ctx context.Context, table *schema.Table) error {
	rows, err := s.db.QueryContext(ctx, `
		SELECT "from", "table", COALESCE("to", '')
		FROM pragma_foreign_key_list(?)
		ORDER BY id, seq`, table.Name)
	if err != nil {
		return fmt.Errorf("references of %s: %w", table.Name, err)
	}

	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var reference schema.Reference

		if err := rows.Scan(&reference.Column, &reference.Table, &reference.Target); err != nil {
			return fmt.Errorf("scan reference of %s: %w", table.Name, err)
		}

		table.References = append(table.References, reference)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate references of %s: %w", table.Name, err)
	}

	return nil
}
