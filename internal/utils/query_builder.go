package utils

import (
	"fmt"
	"strings"
)

// queryBuilder helps construct SQL WHERE clauses with parameterized queries.
// It maintains the argument list and parameter index for safe SQL generation.
type queryBuilder struct {
	conditions []string
	args       []any
	argIndex   int
}

// newQueryBuilder creates a queryBuilder with an initial WHERE condition.
func QueryBuilder(initialCondition string) *queryBuilder {
	return &queryBuilder{
		conditions: []string{initialCondition},
		args:       []any{},
		argIndex:   1,
	}
}

// addInFilter adds an IN clause filter for array values (e.g., "id IN ($1,$2,$3)").
func (qb *queryBuilder) AddInFilter(column string, values []int) {
	if len(values) == 0 {
		return
	}
	placeholders := qb.BuildPlaceholders(len(values))
	qb.conditions = append(qb.conditions, fmt.Sprintf("%s IN (%s)", column, placeholders))
	for _, v := range values {
		qb.args = append(qb.args, v)
	}
}

// addInFilterString adds an IN clause filter for string array values.
func (qb *queryBuilder) AddInFilterString(column string, values []string) {
	if len(values) == 0 {
		return
	}
	placeholders := qb.BuildPlaceholders(len(values))
	qb.conditions = append(qb.conditions, fmt.Sprintf("%s IN (%s)", column, placeholders))
	for _, v := range values {
		qb.args = append(qb.args, v)
	}
}

// addLikeFilter adds an ILIKE clause for partial text matching.
func (qb *queryBuilder) AddLikeFilter(column, value string) {
	if value == "" {
		return
	}
	qb.conditions = append(qb.conditions, fmt.Sprintf("%s ILIKE $%d", column, qb.argIndex))
	qb.args = append(qb.args, "%"+value+"%")
	qb.argIndex++
}

// buildPlaceholders generates SQL placeholders like "$1,$2,$3" for the current arg index.
func (qb *queryBuilder) BuildPlaceholders(count int) string {
	placeholders := make([]string, count)
	for i := 0; i < count; i++ {
		placeholders[i] = fmt.Sprintf("$%d", qb.argIndex)
		qb.argIndex++
	}
	return strings.Join(placeholders, ",")
}

// ToWhereClause returns the complete WHERE clause string.
func (qb *queryBuilder) ToWhereClause() string {
	return "WHERE " + strings.Join(qb.conditions, " AND ")
}

// GetArgs returns the slice of query arguments.
func (qb *queryBuilder) GetArgs() []any {
	return qb.args
}

// NextArgIndex returns the next argument index for LIMIT/OFFSET.
func (qb *queryBuilder) NextArgIndex() int {
	return qb.argIndex
}

// BuildOrderBy constructs a safe ORDER BY clause from user input.
// Maps camelCase field names to snake_case database column names and validates direction.
// Returns a safe SQL ORDER BY clause or defaults to "ORDER BY created_at DESC".
func (qb *queryBuilder) BuildOrderBy(orderBy, orderDirection string, validColumns map[string]string) string {
	// Get the database column name, default to created_at if invalid
	column, ok := validColumns[orderBy]
	if !ok || column == "" {
		column = "created_at"
	}

	// Validate direction, default to DESC if invalid
	direction := "DESC"
	if orderDirection == "asc" || orderDirection == "ASC" {
		direction = "ASC"
	}

	return fmt.Sprintf("ORDER BY %s %s", column, direction)
}
