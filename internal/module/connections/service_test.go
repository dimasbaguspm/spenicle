package connections_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
)

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

type fakeStore struct {
	connection entity.Connection
	found      bool
	saves      int
}

func (s *fakeStore) ConnectionByProvider(_ context.Context, _ string) (entity.Connection, bool, error) {
	return s.connection, s.found, nil
}

func (s *fakeStore) SaveConnection(
	_ context.Context,
	connection entity.Connection,
) (entity.Connection, error) {
	s.saves++
	s.found = true
	s.connection = connection

	return connection, nil
}

func (s *fakeStore) RevokeConnection(
	_ context.Context,
	ref string,
	at time.Time,
) (entity.Connection, bool, error) {
	if !s.found || s.connection.Ref != ref {
		return entity.Connection{}, false, nil
	}

	s.connection.RevokedAt = &at

	return s.connection, true, nil
}

type fakeSettings struct{ values map[string]string }

func (s *fakeSettings) Setting(_ context.Context, key string) (string, bool, error) {
	value, found := s.values[key]

	return value, found, nil
}

func (s *fakeSettings) SetSetting(_ context.Context, key, value string) error {
	s.values[key] = value

	return nil
}

type fakeAuthorizer struct {
	grant   connections.Grant
	err     error
	refresh int
}

func (a *fakeAuthorizer) Name() string { return constant.ProviderGoogle }

func (a *fakeAuthorizer) Scopes() []string { return []string{"scope:mail"} }

func (a *fakeAuthorizer) Authorize(params connections.AuthorizeParams) string {
	return "https://provider/auth?state=" + params.State
}

func (a *fakeAuthorizer) Exchange(
	_ context.Context,
	_ connections.ExchangeParams,
) (connections.Grant, error) {
	return a.grant, a.err
}

func (a *fakeAuthorizer) Refresh(
	_ context.Context,
	_ connections.RefreshParams,
) (connections.Grant, error) {
	a.refresh++

	return a.grant, a.err
}

func (a *fakeAuthorizer) Revoke(_ context.Context, _ string) error { return nil }

func newService(
	t *testing.T,
	store *fakeStore,
	settings *fakeSettings,
	authorizer *fakeAuthorizer,
	clock fixedClock,
) *connections.Service {
	t.Helper()

	sealer, err := seal.New("0123456789abcdef0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	return connections.New(store, settings, sealer, authorizer, clock)
}

func TestStartRequiresAClient(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   connections.StartInput
	}{
		{name: "no client id", in: connections.StartInput{ClientSecret: "s", RedirectURL: "https://x/cb"}},
		{name: "no secret", in: connections.StartInput{ClientID: "id", RedirectURL: "https://x/cb"}},
		{name: "no redirect", in: connections.StartInput{ClientID: "id", ClientSecret: "s"}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			service := newService(t, &fakeStore{}, &fakeSettings{}, &fakeAuthorizer{},
				fixedClock{at: time.Unix(1_700_000_000, 0).UTC()})

			if _, err := service.Start(context.Background(), test.in); !errors.Is(err,
				connections.ErrClientMissing) {
				t.Fatalf("err = %v, want ErrClientMissing", err)
			}
		})
	}
}

func TestStartSealsTheClientAndSignsTheState(t *testing.T) {
	t.Parallel()

	settings := &fakeSettings{values: map[string]string{}}
	service := newService(t, &fakeStore{}, settings, &fakeAuthorizer{},
		fixedClock{at: time.Unix(1_700_000_000, 0).UTC()})

	authorization, err := service.Start(context.Background(), connections.StartInput{
		ClientID: "client-id", ClientSecret: "client-secret", RedirectURL: "https://x/cb",
	})
	if err != nil {
		t.Fatalf("start: %v", err)
	}

	if !strings.Contains(authorization.AuthorizeURL, authorization.State) {
		t.Fatalf("authorize url %q does not carry the state", authorization.AuthorizeURL)
	}

	sealed := settings.values[constant.SettingGoogleClient]
	if !strings.HasPrefix(sealed, "v1:") {
		t.Fatalf("stored client = %q, want a sealed envelope", sealed)
	}
}

func TestCompleteRefusesAForgedState(t *testing.T) {
	t.Parallel()

	settings := &fakeSettings{values: map[string]string{}}
	service := newService(t, &fakeStore{}, settings, &fakeAuthorizer{grant: connections.Grant{
		RefreshToken: "refresh", AccessToken: "access", ExpiresIn: time.Hour,
	}}, fixedClock{at: time.Unix(1_700_000_000, 0).UTC()})

	if _, err := service.Complete(context.Background(), connections.CompleteInput{
		Code: "code", State: "1700000000.forged",
	}); !errors.Is(err, connections.ErrStateInvalid) {
		t.Fatalf("err = %v, want ErrStateInvalid", err)
	}
}

func TestCompleteStoresTheSealedGrant(t *testing.T) {
	t.Parallel()

	now := time.Unix(1_700_000_000, 0).UTC()
	store := &fakeStore{}
	settings := &fakeSettings{values: map[string]string{}}
	authorizer := &fakeAuthorizer{grant: connections.Grant{
		RefreshToken: "refresh-token", AccessToken: "access-token", ExpiresIn: time.Hour,
		Sub: "sub-1", Account: "me@example.com", Scopes: []string{"scope:mail"},
	}}
	service := newService(t, store, settings, authorizer, fixedClock{at: now})

	authorization, err := service.Start(context.Background(), connections.StartInput{
		ClientID: "client-id", ClientSecret: "client-secret", RedirectURL: "https://x/cb",
	})
	if err != nil {
		t.Fatalf("start: %v", err)
	}

	connection, err := service.Complete(context.Background(), connections.CompleteInput{
		Code: "code", State: authorization.State,
	})
	if err != nil {
		t.Fatalf("complete: %v", err)
	}

	if connection.Account != "me@example.com" || connection.Status != constant.ConnectionStatusActive {
		t.Fatalf("connection = %+v, want an active grant for the account", connection)
	}

	if strings.Contains(connection.RefreshToken, "refresh-token") {
		t.Fatal("the refresh token was stored in plaintext")
	}
}

func TestTokenRefreshesAnExpiredAccessToken(t *testing.T) {
	t.Parallel()

	now := time.Unix(1_700_000_000, 0).UTC()
	sealer, err := seal.New("0123456789abcdef0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	ctx := context.Background()

	refresh, err := sealer.Seal(ctx, []byte("refresh-token"))
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	access, err := sealer.Seal(ctx, []byte("stale-access"))
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	store := &fakeStore{found: true, connection: entity.Connection{
		Ref: "conn", Provider: constant.ProviderGoogle, RefreshToken: refresh,
		AccessToken: access, AccessExpiresAt: now.Add(-time.Minute),
		Status: constant.ConnectionStatusActive,
	}}

	settings := &fakeSettings{values: map[string]string{}}
	sealedClient, err := sealer.Seal(ctx, []byte(
		`{"client_id":"id","client_secret":"secret","redirect_url":"https://x/cb"}`,
	))
	if err != nil {
		t.Fatalf("seal client: %v", err)
	}

	settings.values[constant.SettingGoogleClient] = sealedClient

	authorizer := &fakeAuthorizer{grant: connections.Grant{
		AccessToken: "fresh-access", ExpiresIn: time.Hour,
	}}

	service := newService(t, store, settings, authorizer, fixedClock{at: now})

	token, err := service.Token(ctx)
	if err != nil {
		t.Fatalf("token: %v", err)
	}

	if token != "fresh-access" {
		t.Fatalf("token = %q, want the refreshed one", token)
	}

	if authorizer.refresh != 1 || store.saves != 1 {
		t.Fatalf("refreshes = %d, saves = %d, want one each", authorizer.refresh, store.saves)
	}
}

func TestTokenPersistsReauthRequiredOnInvalidGrant(t *testing.T) {
	t.Parallel()

	now := time.Unix(1_700_000_000, 0).UTC()
	sealer, err := seal.New("0123456789abcdef0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	ctx := context.Background()

	refresh, err := sealer.Seal(ctx, []byte("refresh-token"))
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	store := &fakeStore{found: true, connection: entity.Connection{
		Ref: "conn", Provider: constant.ProviderGoogle, RefreshToken: refresh,
		Status: constant.ConnectionStatusActive,
	}}

	settings := &fakeSettings{values: map[string]string{}}
	sealedClient, err := sealer.Seal(ctx, []byte(
		`{"client_id":"id","client_secret":"secret","redirect_url":"https://x/cb"}`,
	))
	if err != nil {
		t.Fatalf("seal client: %v", err)
	}

	settings.values[constant.SettingGoogleClient] = sealedClient

	service := newService(t, store, settings,
		&fakeAuthorizer{err: connections.ErrReauthRequired}, fixedClock{at: now})

	if _, err := service.Token(ctx); !errors.Is(err, connections.ErrReauthRequired) {
		t.Fatalf("err = %v, want ErrReauthRequired", err)
	}

	if store.connection.Status != constant.ConnectionStatusReauthRequired {
		t.Fatalf("status = %q, want %q", store.connection.Status,
			constant.ConnectionStatusReauthRequired)
	}
}

func TestRevokeWithoutAConnectionIsNotFound(t *testing.T) {
	t.Parallel()

	service := newService(t, &fakeStore{}, &fakeSettings{}, &fakeAuthorizer{},
		fixedClock{at: time.Unix(1_700_000_000, 0).UTC()})

	if _, err := service.Revoke(context.Background()); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
}
