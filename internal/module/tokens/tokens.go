// Package tokens issues the non-root credentials: a named, scoped API token the
// caller keeps, and a keyed digest the database keeps. This file is the
// package's contract; service.go implements it.
package tokens

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Store interface {
	InsertToken(ctx context.Context, token entity.Token) (entity.Token, error)
	TokenByDigest(ctx context.Context, digest string) (entity.Token, bool, error)
	ListTokens(ctx context.Context, filter entity.TokenFilter) ([]entity.Token, error)
	RevokeToken(ctx context.Context, ref string, at time.Time) (entity.Token, bool, error)
	TouchToken(ctx context.Context, ref string, at time.Time) error
}

// Digestor keys the plaintext token under APP_SECRET, so the row is a one-way
// digest and a stolen database is not a stolen set of credentials.
type Digestor interface {
	Digest(plain string) string
}

type TimeSource interface{ Now() time.Time }

type Contract interface {
	Create(ctx context.Context, in CreateInput) (entity.Token, string, error)
	List(ctx context.Context, filter entity.TokenFilter) ([]entity.Token, error)
	Revoke(ctx context.Context, ref string) (entity.Token, error)
	Verify(ctx context.Context, plain string) (entity.Token, bool, error)
}

type CreateInput struct {
	Name      string
	Scopes    []string
	ExpiresAt *time.Time
}
