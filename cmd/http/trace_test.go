package httpcmd_test

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	httpcmd "github.com/dimasbaguspm/spenicle/cmd/http"
	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const appSecret = "trace-secret-0123456789"

func newServer(t *testing.T) http.Handler {
	t.Helper()

	ctx := t.Context()
	path := filepath.Join(t.TempDir(), "spenicle.db")

	store, err := sqlite.New(ctx, sqlite.Config{Path: path})
	if err != nil {
		t.Fatalf("open store: %v", err)
	}

	t.Cleanup(func() {
		if closeErr := store.Close(ctx); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	})

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	sealer, err := seal.New(appSecret)
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	if _, baselineErr := store.EnsureBaseline(ctx, "IDR", sealer.Fingerprint()); baselineErr != nil {
		t.Fatalf("baseline: %v", baselineErr)
	}

	settingsService := settings.New(store, sealer, clock.System{})
	if _, _, settingsErr := settingsService.EnsureInitial(ctx, "", ""); settingsErr != nil {
		t.Fatalf("settings: %v", settingsErr)
	}

	return httpcmd.New(handlers.Deps{
		Ledger:   ledger.New(store, store, store, settingsService, nil, clock.System{}, clock.System{}),
		Accounts: store,
		Payees:   store,
		Settings: settingsService,
	})
}

func spansByName(recorded []sdktrace.ReadOnlySpan) map[string]sdktrace.ReadOnlySpan {
	out := make(map[string]sdktrace.ReadOnlySpan, len(recorded))

	for _, span := range recorded {
		out[span.Name()] = span
	}

	return out
}

func assertSharedTrace(t *testing.T, spans map[string]sdktrace.ReadOnlySpan, name, rootName string) {
	t.Helper()

	span, found := spans[name]
	if !found {
		t.Fatalf("span %q was not recorded", name)
	}

	root := spans[rootName]
	if span.SpanContext().TraceID() != root.SpanContext().TraceID() {
		t.Fatalf("%s carries trace %s, want %s",
			name, span.SpanContext().TraceID(), root.SpanContext().TraceID())
	}

	if !hasAttribute(span, telemetry.AttrComponent, telemetry.ComponentHTTP) {
		t.Fatalf("%s does not carry %s=%s", name, telemetry.AttrComponent, telemetry.ComponentHTTP)
	}
}

func assertChild(t *testing.T, spans map[string]sdktrace.ReadOnlySpan, childName, parentName string) {
	t.Helper()

	if spans[childName].Parent().SpanID() != spans[parentName].SpanContext().SpanID() {
		t.Fatalf("%s is not a child of %s", childName, parentName)
	}
}

func assertChain(t *testing.T, spans map[string]sdktrace.ReadOnlySpan, chain []string) {
	t.Helper()

	for _, name := range chain {
		assertSharedTrace(t, spans, name, chain[0])
	}

	for index := 1; index < len(chain); index++ {
		assertChild(t, spans, chain[index], chain[index-1])
	}
}

func hasAttribute(span sdktrace.ReadOnlySpan, key, value string) bool {
	for _, attr := range span.Attributes() {
		if string(attr.Key) == key && attr.Value.AsString() == value {
			return true
		}
	}

	return false
}

func TestRequestSpanTree(t *testing.T) {
	telemetry.SetIdentity("spenicle-http", "test", telemetry.ComponentHTTP)

	server := newServer(t)

	tests := []struct {
		name  string
		path  string
		chain []string
	}{
		{
			name: "listing entries",
			path: "/api/entries",
			chain: []string{
				"Handler.Entries.List",
				"Module.Ledger.List",
				"Repository.Sqlite.ListEntries",
			},
		},
		{
			name:  "listing accounts",
			path:  "/api/accounts",
			chain: []string{"Handler.Accounts.List", "Repository.Sqlite.ListAccounts"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := telemetry.RecordSpans()

			response := httptest.NewRecorder()
			server.ServeHTTP(response, httptest.NewRequest(http.MethodGet, test.path, http.NoBody))

			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
			}

			assertChain(t, spansByName(recorder.Ended()), test.chain)
		})
	}
}
