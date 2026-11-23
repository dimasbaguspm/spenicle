package erd_test

import (
	"context"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/module/erd"
	"github.com/dimasbaguspm/spenicle/internal/repository/schema"
)

type stubSchema struct {
	tables []schema.Table
}

func (s stubSchema) Tables(context.Context) ([]schema.Table, error) { return s.tables, nil }

func TestDocumentRendersEntitiesAndRelationships(t *testing.T) {
	t.Parallel()

	service := erd.New(stubSchema{tables: []schema.Table{
		{
			Name: "accounts",
			Columns: []schema.Column{
				{Name: "id", Type: "INTEGER", PrimaryKey: true},
				{Name: "name", Type: "TEXT", NotNull: true},
			},
		},
		{
			Name: "ledger_entries",
			Columns: []schema.Column{
				{Name: "id", Type: "INTEGER", PrimaryKey: true},
				{Name: "account_id", Type: "INTEGER", NotNull: true},
			},
			References: []schema.Reference{{Column: "account_id", Table: "accounts", Target: "id"}},
		},
		{Name: "schema_migrations", Columns: []schema.Column{{Name: "version", Type: "INTEGER"}}},
	}})

	document, err := service.Document(t.Context())
	if err != nil {
		t.Fatalf("document: %v", err)
	}

	for _, want := range []string{
		"erDiagram",
		"accounts {",
		"INTEGER id PK",
		"TEXT name",
		"INTEGER account_id FK",
		`accounts ||--o{ ledger_entries : "account_id"`,
	} {
		if !strings.Contains(document, want) {
			t.Fatalf("document is missing %q:\n%s", want, document)
		}
	}

	if strings.Contains(document, "schema_migrations") {
		t.Fatalf("internal table leaked into the diagram:\n%s", document)
	}
}
