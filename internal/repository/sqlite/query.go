package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

type listQuery struct {
	table   string
	columns string
	joins   string
	where   []string
	args    []any
	order   string
}

func newList(table, columns string) *listQuery {
	return &listQuery{table: table, columns: columns}
}

func (q *listQuery) join(clause string) {
	q.joins = clause
}

func (q *listQuery) eq(column, value string) {
	if value == "" {
		return
	}

	q.and(column+` = ?`, value)
}

func (q *listQuery) gte(column, value string) {
	q.and(column+` >= ?`, value)
}

func (q *listQuery) lte(column, value string) {
	q.and(column+` <= ?`, value)
}

func (q *listQuery) like(column, value string) {
	if value == "" {
		return
	}

	q.and(column+` LIKE ? ESCAPE '\'`, "%"+escapeLike(value)+"%")
}

func (q *listQuery) prefix(column, value string) {
	if value == "" {
		return
	}

	lower, upper, hasUpper := prefixBounds(value)

	expression := `lower(` + column + `)`
	if hasUpper {
		q.and(expression+` >= ? AND `+expression+` < ?`, lower, upper)
		return
	}

	q.and(expression+` >= ?`, lower)
}

func (q *listQuery) prefixInSubquery(column, table, keyColumn, nameColumn, value string) {
	if value == "" {
		return
	}

	lower, upper, hasUpper := prefixBounds(value)
	expression := `lower(` + nameColumn + `)`
	predicate := expression + ` >= ?`
	args := []any{lower}

	if hasUpper {
		predicate += ` AND ` + expression + ` < ?`

		args = append(args, upper)
	}

	q.and(column+` IN (SELECT `+keyColumn+` FROM `+table+` WHERE `+predicate+`)`, args...)
}

func prefixBounds(value string) (string, string, bool) {
	lower := asciiLower(value)
	upper, ok := prefixUpper(lower)

	return lower, upper, ok
}

func asciiLower(value string) string {
	bytes := []byte(value)
	for index, char := range bytes {
		if char >= 'A' && char <= 'Z' {
			bytes[index] = char + ('a' - 'A')
		}
	}

	return string(bytes)
}

func prefixUpper(value string) (string, bool) {
	runes := []rune(value)
	for index := len(runes) - 1; index >= 0; index-- {
		if runes[index] < unicode.MaxRune {
			runes[index]++

			return string(runes[:index+1]), true
		}
	}

	return "", false
}

func (q *listQuery) inList(column string, values []string) {
	if len(values) == 0 {
		return
	}

	//nolint:gosec // G202: placeholders() emits only "?" and commas, never caller text
	q.where = append(q.where, column+` IN (`+placeholders(len(values))+`)`)

	for _, value := range values {
		q.args = append(q.args, value)
	}
}

func (q *listQuery) inSubquery(column, subquery string, values ...string) {
	if len(values) == 0 {
		return
	}

	//nolint:gosec // G202: placeholders() emits only "?" and commas, never caller text
	q.and(column+` IN (`+subquery+` IN (`+placeholders(len(values))+`))`, toAny(values)...)
}

func (q *listQuery) parentRef(column, ref string) {
	if ref == "" {
		return
	}

	q.and(column+` = ?`, ref)
}

// nullFlag keeps or drops the rows where a nullable column is set: an absent value
// means both, `true` means "only the rows that have it".
func (q *listQuery) nullFlag(column, want string) {
	switch want {
	case "true":
		q.null(column, true)
	case "false":
		q.null(column, false)
	}
}

// null keeps or drops the rows where a nullable column is set: `true` means
// "only the rows that have it", `false` means "only the rows that do not".
func (q *listQuery) null(column string, set bool) {
	switch {
	case set:
		q.where = append(q.where, column+` IS NOT NULL`)
	case !set:
		q.where = append(q.where, column+` IS NULL`)
	}
}

func toAny(values []string) []any {
	out := make([]any, 0, len(values))

	for _, value := range values {
		out = append(out, value)
	}

	return out
}

func (q *listQuery) before(column, table, ref string) {
	if ref == "" {
		return
	}

	q.and(column+` < (SELECT id FROM `+table+` WHERE ref = ?)`, ref)
}

// beforeDay pages by the day a row happened, with the row's own id as the tie-break: the cursor
// ref names the row, and the page continues after it in (day, id) order. SQLite compares the row
// values left to right, which is exactly the ordering the query asks for.
func (q *listQuery) beforeDay(dayColumn, idColumn, table, ref string) {
	if ref == "" {
		return
	}

	q.and(`(`+dayColumn+`, `+idColumn+`) < (SELECT occurred_on, id FROM `+table+` WHERE ref = ?)`, ref)
}

func (q *listQuery) after(outer, inner, table, ref string) {
	if ref == "" {
		return
	}

	q.and(`(`+outer+`) > (SELECT `+inner+` FROM `+table+` WHERE ref = ?)`, ref)
}

func (q *listQuery) orderBy(clause string) {
	q.order = clause
}

func (q *listQuery) page(limit int) (string, []any) {
	var statement strings.Builder

	statement.WriteString(`SELECT ` + q.columns + ` FROM ` + q.table)

	if q.joins != "" {
		statement.WriteString(` ` + q.joins)
	}

	statement.WriteString(` WHERE 1 = 1`)

	for _, clause := range q.where {
		statement.WriteString(` AND ` + clause)
	}

	if q.order != "" {
		statement.WriteString(` ORDER BY ` + q.order)
	}

	statement.WriteString(` LIMIT ` + strconv.Itoa(limit+1))

	return statement.String(), q.args
}

func (q *listQuery) and(clause string, values ...any) {
	q.where = append(q.where, clause)
	q.args = append(q.args, values...)
}

func escapeLike(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}

func pageScan[T any](
	ctx context.Context,
	db *sql.DB,
	what string,
	builder *listQuery,
	limit int,
	scan func(interface{ Scan(dest ...any) error }) (T, error),
) ([]T, error) {
	query, args := builder.page(limit)

	return scanRows(ctx, db, what, query, args, scan)
}

func scanRows[T any](
	ctx context.Context,
	db *sql.DB,
	what, query string,
	args []any,
	scan func(interface{ Scan(dest ...any) error }) (T, error),
) ([]T, error) {
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select %s: %w", what, err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]T, 0)

	for rows.Next() {
		item, scanErr := scan(rows)
		if scanErr != nil {
			return nil, scanErr
		}

		out = append(out, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate %s: %w", what, err)
	}

	return out, nil
}
