package google_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/repository/oauth/google"
)

type recordedCall struct {
	path string
	form url.Values
}

func stubServer(t *testing.T, answer string) (*httptest.Server, *[]recordedCall) {
	t.Helper()

	calls := &[]recordedCall{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("parse form: %v", err)
		}

		*calls = append(*calls, recordedCall{path: r.URL.Path, form: r.PostForm})
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(answer))
	}))

	t.Cleanup(server.Close)

	return server, calls
}

func idToken(t *testing.T, claims map[string]string) string {
	t.Helper()

	payload, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("marshal claims: %v", err)
	}

	return "header." + base64.RawURLEncoding.EncodeToString(payload) + ".signature"
}

func TestAuthorizeBuildsAnOfflineConsentURL(t *testing.T) {
	t.Parallel()

	client := google.New(nil, "", "", "")

	raw := client.Authorize(connections.AuthorizeParams{
		ClientID:    "the-client",
		RedirectURL: "http://localhost:8080/api/connections/google/callback",
		State:       "the-state",
		Scopes:      client.Scopes(),
	})

	parsed, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("authorize url: %v", err)
	}

	query := parsed.Query()

	for key, want := range map[string]string{
		"client_id":     "the-client",
		"state":         "the-state",
		"access_type":   "offline",
		"prompt":        "consent",
		"response_type": "code",
	} {
		if got := query.Get(key); got != want {
			t.Fatalf("%s = %q, want %q", key, got, want)
		}
	}

	if !strings.Contains(query.Get("scope"), "gmail.readonly") {
		t.Fatalf("scope = %q, want the gmail readonly scope", query.Get("scope"))
	}
}

func TestExchangeSendsTheCodeAndReadsTheGrant(t *testing.T) {
	t.Parallel()

	token := idToken(t, map[string]string{"sub": "sub-1", "email": "me@example.com"})
	server, calls := stubServer(t, `{"access_token":"access","refresh_token":"refresh",
		"expires_in":3599,"scope":"openid email https://www.googleapis.com/auth/gmail.readonly",
		"id_token":"`+token+`"}`)

	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	grant, err := client.Exchange(context.Background(), connections.ExchangeParams{
		ClientID: "id", ClientSecret: "secret", RedirectURL: "https://x/cb", Code: "the-code",
	})
	if err != nil {
		t.Fatalf("exchange: %v", err)
	}

	if grant.AccessToken != "access" || grant.RefreshToken != "refresh" {
		t.Fatalf("grant = %+v, want both tokens", grant)
	}

	if grant.Account != "me@example.com" || grant.Sub != "sub-1" {
		t.Fatalf("claims = %s/%s, want the id_token claims", grant.Sub, grant.Account)
	}

	if len(grant.Scopes) != 3 || grant.ExpiresIn.Seconds() != 3599 {
		t.Fatalf("grant = %+v, want three scopes and the lifetime", grant)
	}

	sent := (*calls)[0]
	for key, want := range map[string]string{
		"grant_type": "authorization_code", "code": "the-code", "client_id": "id",
	} {
		if got := sent.form.Get(key); got != want {
			t.Fatalf("%s = %q, want %q", key, got, want)
		}
	}
}

func TestExchangeMapsInvalidGrantToReauth(t *testing.T) {
	t.Parallel()

	server, _ := stubServer(t, `{"error":"invalid_grant","error_description":"Token expired"}`)
	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	if _, err := client.Exchange(context.Background(), connections.ExchangeParams{
		ClientID: "id", ClientSecret: "secret", Code: "code",
	}); !errors.Is(err, connections.ErrReauthRequired) {
		t.Fatalf("err = %v, want ErrReauthRequired", err)
	}
}

func TestExchangeRefusesAFailureTheCallerCannotFix(t *testing.T) {
	t.Parallel()

	server, _ := stubServer(t, `{"error":"invalid_client"}`)
	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	_, err := client.Exchange(context.Background(), connections.ExchangeParams{
		ClientID: "id", ClientSecret: "secret", Code: "code",
	})
	if !errors.Is(err, connections.ErrProviderFailed) {
		t.Fatalf("err = %v, want ErrProviderFailed", err)
	}

	if errors.Is(err, connections.ErrReauthRequired) {
		t.Fatal("invalid_client needs a new client, not a new consent")
	}
}

func TestRefreshSendsTheRefreshToken(t *testing.T) {
	t.Parallel()

	server, calls := stubServer(t, `{"access_token":"fresh","expires_in":3599}`)
	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	grant, err := client.Refresh(context.Background(), connections.RefreshParams{
		ClientID: "id", ClientSecret: "secret", RefreshToken: "the-refresh",
	})
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}

	if grant.AccessToken != "fresh" {
		t.Fatalf("access = %q, want the fresh one", grant.AccessToken)
	}

	sent := (*calls)[0]
	if sent.form.Get("grant_type") != "refresh_token" ||
		sent.form.Get("refresh_token") != "the-refresh" {
		t.Fatalf("form = %v, want a refresh_token grant", sent.form)
	}
}

func TestRevokePostsTheToken(t *testing.T) {
	t.Parallel()

	server, calls := stubServer(t, `{}`)
	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	if err := client.Revoke(context.Background(), "the-token"); err != nil {
		t.Fatalf("revoke: %v", err)
	}

	if (*calls)[0].form.Get("token") != "the-token" {
		t.Fatalf("form = %v, want the token", (*calls)[0].form)
	}
}

func TestRevokeReportsAProviderRefusal(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))
	t.Cleanup(server.Close)

	client := google.New(nil, server.URL+"/authorize", server.URL+"/token", server.URL+"/revoke")

	if err := client.Revoke(context.Background(), "the-token"); err == nil {
		t.Fatal("revoke answered nil for a 400, want an error")
	}
}
