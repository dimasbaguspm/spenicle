package main

import (
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

// newRouter is the readable route table: who serves what, wired from the
// composition root. The URLs themselves are registered explicitly in
// handlers.New, so this file stays a list of dependencies.
func newRouter(
	store *sqlite.Store,
	sealer seal.Sealer,
	baseCurrency, version string,
	logger *slog.Logger,
) http.Handler {
	// clock.System satisfies both the time and the id contract.
	clockSystem := clock.System{}

	return handlers.New(handlers.Deps{
		Ledger:       ledger.New(store, store, clockSystem, clockSystem),
		Health:       store,
		Sealer:       sealer,
		BaseCurrency: baseCurrency,
		Version:      version,
		Logger:       logger,
	})
}
