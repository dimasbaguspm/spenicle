// Package handlers turns HTTP requests into module calls. It owns the route
// table, the request shapes and the status codes; it owns no business rule.
package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/cmd/http/middlewares"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Deps struct {
	Ledger            ledger.Contract
	Settings          settings.Contract
	Captures          captures.Contract
	Accounts          repository.Accounts
	Health            repository.System
	Sealer            seal.Sealer
	BaseCurrency      string
	Version           string
	HealthTimeout     time.Duration
	MaxBodyBytes      int64
	ExtractionEnabled bool
	Logger            *slog.Logger
}

const maxFormBytes = 11 << 20

type server struct {
	deps Deps
}

func New(deps Deps) http.Handler {
	if deps.Logger == nil {
		deps.Logger = slog.Default()
	}

	instance := &server{deps: deps}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", instance.handleHealth)

	mux.HandleFunc("POST /api/session", instance.handleSession)
	mux.HandleFunc("GET /api/settings", instance.handleGetSettings)
	mux.HandleFunc("PATCH /api/settings", instance.handlePatchSettings)
	mux.HandleFunc("POST /api/password", instance.handlePasswordChange)

	mux.HandleFunc("GET /api/meta", instance.handleMeta)

	mux.HandleFunc("GET /api/entries", instance.handleListEntries)
	mux.HandleFunc("POST /api/entries", instance.handlePostEntry)
	mux.HandleFunc("PATCH /api/entries/{id}", instance.handlePatchEntry)

	mux.HandleFunc("GET /api/captures", instance.handleListCaptures)
	mux.HandleFunc("POST /api/captures", instance.handleCreateCapture)
	mux.HandleFunc("PATCH /api/captures/{id}", instance.handlePatchCapture)

	mux.HandleFunc("/", instance.handleNotFound)

	return middlewares.Chain(instance.requireSession(mux),
		middlewares.Recover(deps.Logger),
		middlewares.Observe(),
		middlewares.Log(deps.Logger),
	)
}

func (s *server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	httpx.WriteError(w, http.StatusNotFound, "not_found", "no route for "+r.Method+" "+r.URL.Path)
}
