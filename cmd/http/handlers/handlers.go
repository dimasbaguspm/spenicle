// Package handlers turns HTTP requests into module calls. It owns the route
// table, the request shapes and the status codes; it owns no business rule.
package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/module/rates"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

type Deps struct {
	Ledger            ledger.Contract
	Settings          settings.Contract
	Captures          captures.Contract
	Rates             rates.Contract
	Accounts          repository.Accounts
	Payees            repository.Payees
	Recurring         repository.Recurring
	Analytics         repository.Analytics
	CustomQueries     repository.CustomQueries
	Health            repository.System
	Sealer            seal.Sealer
	BaseCurrency      string
	Version           string
	WorkerLastRun     func() time.Time
	HealthTimeout     time.Duration
	MaxBodyBytes      int64
	WebOrigin         string
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
	mux.HandleFunc("DELETE /api/session", instance.handleDestroySession)
	mux.HandleFunc("GET /api/settings", instance.handleGetSettings)
	mux.HandleFunc("PATCH /api/settings", instance.handlePatchSettings)
	mux.HandleFunc("POST /api/password", instance.handlePasswordChange)

	mux.HandleFunc("GET /api/meta", instance.handleMeta)
	mux.HandleFunc("GET /api/analytics/months", instance.handleMonthlyAnalytics)
	mux.HandleFunc("GET /api/analytics/categories", instance.handleCategoryAnalytics)
	mux.HandleFunc("POST /api/analytics/custom", instance.handleCreateCustomQuery)
	mux.HandleFunc("PATCH /api/analytics/custom/{ref}", instance.handlePatchCustomQuery)
	mux.HandleFunc("GET /api/analytics/custom/{ref}", instance.handleRunCustomQuery)
	mux.HandleFunc("GET /api/dashboard", instance.handleDashboard)
	mux.HandleFunc("POST /api/setup", instance.handleSetup)

	mux.HandleFunc("GET /api/accounts", instance.handleListAccounts)
	mux.HandleFunc("POST /api/accounts", instance.handleCreateAccount)
	mux.HandleFunc("PATCH /api/accounts/{ref}", instance.handlePatchAccount)
	mux.HandleFunc("GET /api/payees", instance.handleListPayees)
	mux.HandleFunc("POST /api/payees", instance.handleCreatePayee)
	mux.HandleFunc("PATCH /api/payees/{ref}", instance.handlePatchPayee)
	mux.HandleFunc("GET /api/recurring", instance.handleListRecurring)
	mux.HandleFunc("POST /api/recurring", instance.handleCreateRecurring)
	mux.HandleFunc("PATCH /api/recurring/{ref}", instance.handlePatchRecurring)

	mux.HandleFunc("GET /api/entries", instance.handleListEntries)
	mux.HandleFunc("POST /api/entries", instance.handlePostEntry)
	mux.HandleFunc("PATCH /api/entries/{ref}", instance.handlePatchEntry)

	mux.HandleFunc("GET /api/captures", instance.handleListCaptures)
	mux.HandleFunc("POST /api/captures", instance.handleCreateCapture)
	mux.HandleFunc("PATCH /api/captures/{ref}", instance.handlePatchCapture)

	mux.HandleFunc("GET /api/rates", instance.handleGetRate)

	mux.HandleFunc("/", instance.handleNotFound)

	return httpx.Chain(instance.requireSession(mux),
		httpx.CORS(deps.WebOrigin),
		httpx.Recover(deps.Logger),
		httpx.Observe(),
		httpx.Log(deps.Logger),
	)
}

func (s *server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	httpx.WriteError(w, http.StatusNotFound, "not_found", "no route for "+r.Method+" "+r.URL.Path)
}
