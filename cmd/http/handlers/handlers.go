// Package handlers turns HTTP requests into module calls. It owns the route
// table, the request shapes and the status codes; it owns no business rule.
package handlers

import (
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/cmd/http/middlewares"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

// Deps is everything the transport needs, injected.
type Deps struct {
	Ledger       ledger.Contract
	Health       repository.System
	Sealer       seal.Sealer
	BaseCurrency string
	Version      string
	Logger       *slog.Logger
}

// server holds the dependencies the handlers share.
type server struct {
	deps Deps
}

// New registers every route explicitly and returns the wrapped handler.
func New(deps Deps) http.Handler {
	if deps.Logger == nil {
		deps.Logger = slog.Default()
	}

	instance := &server{deps: deps}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", instance.handleHealth)
	mux.HandleFunc("POST /api/entries", instance.handlePostEntry)
	mux.HandleFunc("/", instance.handleNotFound)

	return middlewares.Chain(mux,
		middlewares.Recover(deps.Logger),
		middlewares.Observe(),
		middlewares.Log(deps.Logger),
	)
}

func (s *server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	httpx.WriteError(w, http.StatusNotFound, "not_found", "no route for "+r.Method+" "+r.URL.Path)
}
