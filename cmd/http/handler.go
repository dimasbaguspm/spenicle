package httpcmd

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/actor"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/logging"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

type server struct {
	api      *handlers.Server
	settings settings.Contract
	tokens   tokens.Contract
	logger   *logging.Logger
}

func Handler(ctx context.Context, process *config.Process) (http.Handler, error) {
	deps, err := buildDeps(ctx, process)
	if err != nil {
		return nil, err
	}

	return New(deps), nil
}

func New(deps handlers.Deps) http.Handler {
	if deps.Logger == nil {
		deps.Logger = logging.New(telemetry.ComponentHTTP)
	}

	instance := &server{
		api:      handlers.New(deps),
		settings: deps.Settings,
		tokens:   deps.Tokens,
		logger:   deps.Logger,
	}

	groups := instance.routes()

	return httpx.Chain(
		instance.authenticate(groups),
		httpx.Recover(deps.Logger),
		httpx.Observe(routeOf(groups.public, groups.root, groups.scoped)),
		httpx.Log(deps.Logger),
	)
}

func routeOf(muxes ...*http.ServeMux) func(*http.Request) string {
	return func(r *http.Request) string {
		for _, mux := range muxes {
			if _, pattern := mux.Handler(r); pattern != "" {
				return pattern
			}
		}

		return notFoundPattern
	}
}

func patternOf(mux *http.ServeMux, r *http.Request) string {
	_, pattern := mux.Handler(r)

	return pattern
}

const notFoundPattern = "/*"

// routeGroups is the three surfaces of the API: open to everyone, root
// credential only, or any credential carrying the scope the route asks for.
type routeGroups struct {
	public *http.ServeMux
	root   *http.ServeMux
	scoped *http.ServeMux
}

// routes declares each route exactly once, in the group that may reach it.
func (s *server) routes() routeGroups {
	groups := routeGroups{
		public: http.NewServeMux(),
		root:   http.NewServeMux(),
		scoped: http.NewServeMux(),
	}

	groups.public.HandleFunc("GET /healthz", s.api.Health)
	groups.public.HandleFunc("POST /api/session", s.api.Session)

	// root credential only
	groups.root.HandleFunc("POST /api/password", s.api.ChangePassword)
	groups.root.HandleFunc("PATCH /api/settings", s.api.PatchSettings)
	groups.root.HandleFunc("GET /api/tokens", s.api.ListTokens)
	groups.root.HandleFunc("POST /api/tokens", s.api.CreateToken)
	groups.root.HandleFunc("POST /api/tokens/{ref}/revoke", s.api.RevokeToken)

	// any credential with the route's scope
	groups.scoped.HandleFunc("GET /api/settings", s.api.GetSettings)
	groups.scoped.HandleFunc("GET /api/meta", s.api.GetMeta)
	groups.scoped.HandleFunc("POST /api/setup", s.api.Setup)

	groups.scoped.HandleFunc("GET /api/analytics/months", s.api.MonthlyAnalytics)
	groups.scoped.HandleFunc("GET /api/analytics/categories", s.api.CategoryAnalytics)
	groups.scoped.HandleFunc("POST /api/analytics/custom", s.api.CreateCustomQuery)
	groups.scoped.HandleFunc("PATCH /api/analytics/custom/{ref}", s.api.PatchCustomQuery)
	groups.scoped.HandleFunc("GET /api/analytics/custom/{ref}", s.api.RunCustomQuery)
	groups.scoped.HandleFunc("GET /api/dashboard", s.api.GetDashboard)

	groups.scoped.HandleFunc("GET /api/accounts", s.api.ListAccounts)
	groups.scoped.HandleFunc("POST /api/accounts", s.api.CreateAccount)
	groups.scoped.HandleFunc("PATCH /api/accounts/{ref}", s.api.PatchAccount)
	groups.scoped.HandleFunc("GET /api/payees", s.api.ListPayees)
	groups.scoped.HandleFunc("POST /api/payees", s.api.CreatePayee)
	groups.scoped.HandleFunc("PATCH /api/payees/{ref}", s.api.PatchPayee)
	groups.scoped.HandleFunc("GET /api/recurring", s.api.ListRecurring)
	groups.scoped.HandleFunc("POST /api/recurring", s.api.CreateRecurring)
	groups.scoped.HandleFunc("PATCH /api/recurring/{ref}", s.api.PatchRecurring)

	groups.scoped.HandleFunc("GET /api/entries", s.api.ListEntries)
	groups.scoped.HandleFunc("POST /api/entries", s.api.PostEntry)
	groups.scoped.HandleFunc("PATCH /api/entries/{ref}", s.api.PatchEntry)

	groups.scoped.HandleFunc("GET /api/captures", s.api.ListCaptures)
	groups.scoped.HandleFunc("POST /api/captures", s.api.CreateCapture)
	groups.scoped.HandleFunc("PATCH /api/captures/{ref}", s.api.PatchCapture)
	groups.scoped.HandleFunc("GET /api/captures/{ref}/artifact", s.api.GetCaptureArtifact)

	groups.scoped.HandleFunc("GET /api/imports", s.api.ListImports)
	groups.scoped.HandleFunc("POST /api/imports", s.api.CreateImport)
	groups.scoped.HandleFunc("GET /api/imports/{ref}", s.api.GetImport)
	groups.scoped.HandleFunc("PATCH /api/imports/{ref}", s.api.PatchImport)
	groups.scoped.HandleFunc("GET /api/imports/{ref}/events", s.api.ListImportEvents)
	groups.scoped.HandleFunc("PATCH /api/imports/{ref}/rows/{index}", s.api.PatchImportRow)

	groups.scoped.HandleFunc("GET /api/exports", s.api.ListExports)
	groups.scoped.HandleFunc("POST /api/exports", s.api.CreateExport)
	groups.scoped.HandleFunc("GET /api/exports/{ref}", s.api.GetExport)
	groups.scoped.HandleFunc("GET /api/exports/{ref}/events", s.api.ListExportEvents)
	groups.scoped.HandleFunc("GET /api/exports/{ref}/download", s.api.DownloadExport)

	groups.scoped.HandleFunc("GET /api/rates", s.api.GetRate)
	groups.scoped.HandleFunc("GET /api/audit", s.api.ListAudit)

	return groups
}

// routeScopes is the one table that says which scope a token needs. Root-only
// routes are not listed: they live in their own mux, so a token cannot reach
// them at all.
var routeScopes = map[string]string{ //nolint:gochecknoglobals // one read-only table
	"GET /api/settings": constant.ScopeSettingsRead,
	"GET /api/meta":     constant.ScopeSettingsRead,
	"POST /api/setup":   constant.ScopeAdmin,

	"GET /api/analytics/months":         constant.ScopeAnalyticsRead,
	"GET /api/analytics/categories":     constant.ScopeAnalyticsRead,
	"POST /api/analytics/custom":        constant.ScopeAnalyticsRead,
	"PATCH /api/analytics/custom/{ref}": constant.ScopeAnalyticsRead,
	"GET /api/analytics/custom/{ref}":   constant.ScopeAnalyticsRead,
	"GET /api/dashboard":                constant.ScopeDashboardRead,

	"GET /api/accounts":          constant.ScopeAccountsRead,
	"POST /api/accounts":         constant.ScopeAccountsWrite,
	"PATCH /api/accounts/{ref}":  constant.ScopeAccountsWrite,
	"GET /api/payees":            constant.ScopePayeesRead,
	"POST /api/payees":           constant.ScopePayeesWrite,
	"PATCH /api/payees/{ref}":    constant.ScopePayeesWrite,
	"GET /api/recurring":         constant.ScopeRecurringRead,
	"POST /api/recurring":        constant.ScopeRecurringWrite,
	"PATCH /api/recurring/{ref}": constant.ScopeRecurringWrite,

	"GET /api/entries":         constant.ScopeEntriesRead,
	"POST /api/entries":        constant.ScopeEntriesWrite,
	"PATCH /api/entries/{ref}": constant.ScopeEntriesWrite,

	"GET /api/captures":                constant.ScopeCapturesRead,
	"POST /api/captures":               constant.ScopeCapturesWrite,
	"PATCH /api/captures/{ref}":        constant.ScopeCapturesWrite,
	"GET /api/captures/{ref}/artifact": constant.ScopeCapturesRead,

	"GET /api/imports":                      constant.ScopeImportsRead,
	"POST /api/imports":                     constant.ScopeImportsWrite,
	"GET /api/imports/{ref}":                constant.ScopeImportsRead,
	"PATCH /api/imports/{ref}":              constant.ScopeImportsWrite,
	"GET /api/imports/{ref}/events":         constant.ScopeImportsRead,
	"PATCH /api/imports/{ref}/rows/{index}": constant.ScopeImportsWrite,

	"GET /api/exports":                constant.ScopeExportsRead,
	"POST /api/exports":               constant.ScopeExportsWrite,
	"GET /api/exports/{ref}":          constant.ScopeExportsRead,
	"GET /api/exports/{ref}/events":   constant.ScopeExportsRead,
	"GET /api/exports/{ref}/download": constant.ScopeExportsRead,

	"GET /api/rates": constant.ScopeRatesRead,
	"GET /api/audit": constant.ScopeAuditRead,
}

// credential is who is calling: the root credential (the password session) or one
// scoped token, plus the actor the journal records for this request.
type credential struct {
	root  bool
	token entity.Token
	actor actor.From
}

// authenticate resolves the credential and then hands the request to the group it
// belongs to: public, root-only, or scoped.
func (s *server) authenticate(groups routeGroups) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if patternOf(groups.public, r) != "" {
			groups.public.ServeHTTP(w, r.WithContext(actor.With(r.Context(), userActor(""))))

			return
		}

		who, ok := s.identify(w, r)
		if !ok {
			return
		}

		r = r.WithContext(actor.With(r.Context(), who.actor))

		if patternOf(groups.root, r) != "" {
			if !who.root {
				httpx.WriteError(w, http.StatusForbidden, "forbidden",
					"this route needs the root credential")

				return
			}

			groups.root.ServeHTTP(w, r)

			return
		}

		pattern := patternOf(groups.scoped, r)
		if pattern == "" {
			s.api.NotFound(w, r)

			return
		}

		if !who.root && !s.mayReach(who, pattern) {
			httpx.WriteError(w, http.StatusForbidden, "forbidden",
				"this credential cannot reach "+pattern+requiredFor(routeScopes[pattern]))

			return
		}

		groups.scoped.ServeHTTP(w, r)
	})
}

// identify is the identity middleware: it answers who this request is, from the
// one credential header, and writes the refusal itself when there is no answer.
func (s *server) identify(w http.ResponseWriter, r *http.Request) (credential, bool) {
	ctx := r.Context()

	current, err := s.settings.Load(ctx)
	if err != nil {
		s.writeInternal(ctx, w, err)

		return credential{}, false
	}

	if !current.HasPassword() {
		// open mode: the instance is not protected yet, every request is the root
		return credential{root: true, actor: userActor("")}, true
	}

	if current.PasswordMustChange && r.URL.Path != "/api/password" {
		httpx.WriteError(w, http.StatusConflict, "password_change_required",
			"sign in with the generated password, then set your own at /api/password")

		return credential{}, false
	}

	presented := handlers.Bearer(r)
	if presented == "" {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized",
			"send Authorization: Bearer <credential>")

		return credential{}, false
	}

	rootToken, err := s.settings.SessionToken(ctx)
	if err != nil {
		s.writeInternal(ctx, w, err)

		return credential{}, false
	}

	if subtle.ConstantTimeCompare([]byte(presented), []byte(rootToken)) == 1 {
		return credential{root: true, actor: userActor("")}, true
	}

	if s.tokens == nil {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "unknown credential")

		return credential{}, false
	}

	token, found, err := s.tokens.Verify(ctx, presented)
	if err != nil {
		s.writeInternal(ctx, w, err)

		return credential{}, false
	}

	if !found {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "unknown or revoked credential")

		return credential{}, false
	}

	return credential{token: token, actor: userActor(token.Ref)}, true
}

func (s *server) mayReach(who credential, pattern string) bool {
	scope, delegated := routeScopes[pattern]
	if !delegated {
		return false
	}

	return who.token.Has(scope)
}

func userActor(tokenRef string) actor.From {
	return actor.From{Kind: constant.AuditActorUser, Ref: tokenRef}
}

func requiredFor(scope string) string {
	if scope == "" {
		return ": it needs the root credential"
	}

	return ": it needs the " + scope + " scope"
}

func (s *server) writeInternal(ctx context.Context, w http.ResponseWriter, err error) {
	s.logger.Error(ctx, "request failed", slog.String("error", err.Error()))
	httpx.WriteError(w, http.StatusInternalServerError, "internal_error", "internal error")
}

func buildDeps(ctx context.Context, process *config.Process) (handlers.Deps, error) {
	extractor, err := buildExtractor(ctx, process)
	if err != nil {
		return handlers.Deps{}, err
	}

	parts, err := filestore.NewParts(filepath.Join(process.Cfg.DataDir, config.DefaultImportDirName))
	if err != nil {
		return handlers.Deps{}, fmt.Errorf("import parts: %w", err)
	}

	store := process.Store

	return handlers.Deps{
		Ledger: process.Ledger,
		Captures: captures.New(
			store, process.Ledger, process.Sealer, process.Artifacts, store, extractor, store,
			clock.System{}, clock.System{},
		),
		Rates:         process.Rates,
		Accounts:      store,
		Payees:        store,
		Recurring:     store,
		Analytics:     store,
		CustomQueries: store,
		Artifacts:     store,
		ArtifactFiles: process.Artifacts,
		ExportFiles:   process.Exports,
		Exports: exports.New(
			store, store, store, process.Exports, process.Cfg.ExportRetention, clock.System{},
		),
		Settings: process.Settings,
		Imports: imports.New(
			store, store, store, store, process.Ledger, process.Artifacts, parts, process.Settings,
			clock.System{},
			imports.Options{
				MaxRows:     process.Cfg.ImportMaxRows,
				CommitChunk: process.Cfg.ImportCommitChunk,
			},
		),
		Health:            store,
		Audit:             store,
		Tokens:            tokens.New(store, process.Sealer, clock.System{}),
		Sealer:            process.Sealer,
		BaseCurrency:      process.BaseCurrency,
		Timezone:          process.Cfg.Timezone,
		Version:           config.Version,
		HealthTimeout:     process.Cfg.HealthTimeout,
		MaxBodyBytes:      process.Cfg.MaxBodyBytes,
		MaxArtifactBytes:  process.Cfg.ArtifactMaxBytes,
		ImportMaxBytes:    process.Cfg.ImportMaxBytes,
		ExtractionEnabled: process.Cfg.SnapToJSONAPIKey != "",
		AIAssistance:      process.Cfg.AIAssistance(),
		Logger:            process.Logger,
	}, nil
}

func buildExtractor(ctx context.Context, process *config.Process) (extraction.Extractor, error) {
	rail, err := selectRail(ctx, process.Cfg, process.Logger)
	if err != nil {
		return nil, err
	}

	return rail, nil
}

func selectRail(
	ctx context.Context,
	cfg entity.AppConfig,
	logger *logging.Logger,
) (extraction.Extractor, error) {
	if cfg.SnapToJSONAPIKey != "" {
		rail, err := snaptojson.New(cfg.SnapToJSONEndpoint, cfg.SnapToJSONAPIKey, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("snaptojson rail: %w", err)
		}

		logger.Info(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	if cfg.OpenAIAPIKey != "" {
		rail, err := openai.New(cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.OpenAIHost, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("openai rail: %w", err)
		}

		logger.Info(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	logger.Info(ctx, "no extraction rail configured: captures stay manual")

	return nil, nil //nolint:nilnil // nil extractor is the documented "disabled" mode
}

func Serve(ctx context.Context, process *config.Process, handler http.Handler) error {
	cfg := process.Cfg
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)

	go func() {
		process.Logger.Info(ctx, "listening",
			slog.String("addr", cfg.Addr),
			slog.String("base_currency", process.BaseCurrency),
			slog.Bool("sealed", cfg.Sealed()),
			slog.String("version", config.Version))

		if listenErr := srv.ListenAndServe(); listenErr != nil &&
			!errors.Is(listenErr, http.ErrServerClosed) {
			errCh <- listenErr
		}
	}()

	select {
	case listenErr := <-errCh:
		return fmt.Errorf("serve: %w", listenErr)
	case <-ctx.Done():
		process.Logger.Info(ctx, "shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}
