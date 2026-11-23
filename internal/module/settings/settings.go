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

// Contract is what the transport and the boot sequence are allowed to call.
type Contract interface {
	Load(ctx context.Context) (entity.Settings, error)
	// BaseCurrency is the reporting currency, decoded from settings.
	BaseCurrency(ctx context.Context) (string, error)
	// EnsureInitial seeds the row on a fresh database. An empty password means "open
	// mode": no login screen until a password is set.
	EnsureInitial(ctx context.Context, initialPassword string) (entity.Settings, error)
	// Authenticate compares a login attempt. found=false when no password is set.
	Authenticate(ctx context.Context, password string) (entity.Settings, bool, error)
	ChangePassword(ctx context.Context, current, next string) (entity.Settings, error)
	SetBaseCurrency(ctx context.Context, code string) (entity.Settings, error)
	// SessionToken is the cookie value for this deployment: derived from APP_SECRET,
	// so rotating the secret logs everyone out.
	SessionToken(ctx context.Context) (string, error)
}
