// Package schema declares the contract for reading a database's own structure:
// tables, columns and foreign keys. It is the only thing the ERD needs to know
// about a storage engine, so a second adapter is one new implementation.
package schema

import "context"

type Column struct {
	Name       string
	Type       string
	NotNull    bool
	PrimaryKey bool
	Default    string
}

type Reference struct {
	Column string
	Table  string
	Target string
}

type Table struct {
	Name       string
	Columns    []Column
	References []Reference
}

type Introspector interface {
	Tables(ctx context.Context) ([]Table, error)
}
