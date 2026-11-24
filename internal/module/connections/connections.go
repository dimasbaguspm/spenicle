// Package connections owns the provider credentials: the OAuth dance, the sealed
// tokens and the states that mean "usable", "re-authorise" or "disconnected". It is
// the only place that opens a token, so a consumer asks for one and never stores it.
package connections

import (
	"context"
	"errors"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

var (
	ErrClientMissing  = errors.New("the provider client is not configured")
	ErrStateInvalid   = errors.New("authorisation state is missing, forged or expired")
	ErrReauthRequired = errors.New("the provider grant needs re-authorisation")
	ErrNotConnected   = errors.New("no provider connection is stored")
	ErrProviderFailed = errors.New("the provider refused the request")
)

type Contract interface {
	Status(ctx context.Context) (entity.Connection, bool, error)
	Start(ctx context.Context, in StartInput) (Authorization, error)
	Complete(ctx context.Context, in CompleteInput) (entity.Connection, error)
	Token(ctx context.Context) (string, error)
	Revoke(ctx context.Context) (entity.Connection, error)
}

type StartInput struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type Authorization struct {
	AuthorizeURL string
	State        string
}

type CompleteInput struct {
	Code  string
	State string
}

type Grant struct {
	RefreshToken string
	AccessToken  string
	Scopes       []string
	Sub          string
	Account      string
	ExpiresIn    time.Duration
}

type AuthorizeParams struct {
	ClientID    string
	RedirectURL string
	State       string
	Scopes      []string
}

type ExchangeParams struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Code         string
}

type RefreshParams struct {
	ClientID     string
	ClientSecret string
	RefreshToken string
}

type Authorizer interface {
	Name() string
	Scopes() []string
	Authorize(params AuthorizeParams) string
	Exchange(ctx context.Context, params ExchangeParams) (Grant, error)
	Refresh(ctx context.Context, params RefreshParams) (Grant, error)
	Revoke(ctx context.Context, token string) error
}

type Store interface {
	ConnectionByProvider(ctx context.Context, provider string) (entity.Connection, bool, error)
	SaveConnection(ctx context.Context, connection entity.Connection) (entity.Connection, error)
	RevokeConnection(ctx context.Context, ref string, at time.Time) (entity.Connection, bool, error)
}

type SettingStore interface {
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
}
