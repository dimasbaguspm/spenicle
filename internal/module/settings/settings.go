// Package settings owns the in-app configuration: one sealed JSON row decoded into
// entity.Settings. The environment holds infrastructure; this holds product
// decisions, because those change while the process is running.
//
// This file is the package's contract; service.go implements it.
package settings

import (
	"context"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Contract interface {
	Load(ctx context.Context) (entity.Settings, error)
	BaseCurrency(ctx context.Context) (string, error)
	EnsureInitial(ctx context.Context, initialPassword string) (entity.Settings, error)
	Authenticate(ctx context.Context, password string) (entity.Settings, bool, error)
	ChangePassword(ctx context.Context, current, next string) (entity.Settings, error)
	SetBaseCurrency(ctx context.Context, code string) (entity.Settings, error)
	SessionToken(ctx context.Context) (string, error)
}
