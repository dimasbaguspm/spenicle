package httpcmd

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

type authHarness struct {
	instance *server
	settings *settings.Service
	tokenRef string
	plain    string
}

func newAuthHarness(t *testing.T) authHarness {
	t.Helper()

	ctx := t.Context()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "auth.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if migrateErr := sqlite.Migrate(ctx, db); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	store := sqlite.NewStore(db)
	source := clock.System{}
	settingsService := settings.New(store, sealer, source)
	tokenService := tokens.New(store, sealer, source)

	if _, _, ensureErr := settingsService.EnsureInitial(ctx, "initial-password-123", ""); ensureErr != nil {
		t.Fatalf("ensure initial: %v", ensureErr)
	}

	issued, plain, err := tokenService.Create(ctx, tokens.CreateInput{
		Name:   "reader",
		Scopes: []string{constant.ScopeEntriesRead},
	})
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	return authHarness{
		instance: &server{
			settings: settingsService,
			tokens:   tokenService,
			logger:   logging.New("test"),
		},
		settings: settingsService,
		tokenRef: issued.Ref,
		plain:    plain,
	}
}

func TestPasswordGateRefusesTokensUntilItIsCleared(t *testing.T) {
	harness := newAuthHarness(t)

	identify := func(path string) (credential, *httptest.ResponseRecorder, bool) {
		request := httptest.NewRequest(http.MethodGet, path, http.NoBody)
		request.Header.Set("Authorization", "Bearer "+harness.plain)
		response := httptest.NewRecorder()

		who, ok := harness.instance.identify(response, request)

		return who, response, ok
	}

	blocked, response, ok := identify("/api/entries")
	if ok {
		t.Fatal("a token must not work while the generated password must change")
	}
	if response.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusConflict)
	}
	if !strings.Contains(response.Body.String(), "password_change_required") {
		t.Fatalf("body %q does not name the password gate", response.Body.String())
	}
	if blocked.token.Ref != "" || blocked.root {
		t.Fatalf("the gate returned an identity: %+v", blocked)
	}

	if _, err := harness.settings.ChangePassword(
		t.Context(), "initial-password-123", "my-own-password-456",
	); err != nil {
		t.Fatalf("change password: %v", err)
	}

	allowed, _, ok := identify("/api/entries")
	if !ok {
		t.Fatal("the token must work after the password gate is cleared")
	}
	if allowed.root {
		t.Fatal("a token must not be promoted to root")
	}
	if allowed.token.Ref != harness.tokenRef {
		t.Fatalf("token ref = %q, want %q", allowed.token.Ref, harness.tokenRef)
	}
}
