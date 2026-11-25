package httpcmd

import (
	"context"
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
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	gmailmail "github.com/dimasbaguspm/spenicle/internal/repository/mailbox/gmail"
	"github.com/dimasbaguspm/spenicle/internal/repository/oauth/google"
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
		httpx.Observe(routeOf(groups.public.mux, groups.root.mux, groups.scoped.mux)),
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

// routeGroup is one surface of the API and the scope book it collects while the
// routes register: a token reads its allow-list from the group it was mounted in,
// so a route and the scope it needs are declared on the same line.
type routeGroup struct {
	mux    *http.ServeMux
	scopes map[string]string
}

type routeGroups struct {
	public routeGroup
	root   routeGroup
	scoped routeGroup
}

func newGroup() routeGroup {
	return routeGroup{mux: http.NewServeMux(), scopes: make(map[string]string)}
}

// route mounts one pattern with the scope a token needs; an empty scope means the
// root credential only, which is what the public and root groups use.
func (g routeGroup) route(scope, pattern string, handler http.HandlerFunc) {
	g.mux.HandleFunc(pattern, handler)

	if scope != "" {
		g.scopes[pattern] = scope
	}
}

// routes declares each route exactly once, next to the scope it asks for.
func (s *server) routes() routeGroups {
	groups := routeGroups{public: newGroup(), root: newGroup(), scoped: newGroup()}

	// open to everyone
	groups.public.route("", "GET /healthz", s.api.Health)
	groups.public.route("", "GET /api/connections/google/callback", s.api.CompleteConnection)

	// root credential only
	s.credentialRoutes(groups.root)

	// any credential carrying the scope
	groups.scoped.route(constant.ScopeSettingsRead, "GET /api/settings", s.api.GetSettings)
	groups.scoped.route(constant.ScopeSettingsRead, "GET /api/meta", s.api.GetMeta)
	groups.scoped.route(constant.ScopeAdmin, "POST /api/setup", s.api.Setup)

	groups.scoped.route(constant.ScopeAnalyticsRead, "GET /api/analytics/months", s.api.MonthlyAnalytics)
	groups.scoped.route(constant.ScopeAnalyticsRead, "GET /api/analytics/categories", s.api.CategoryAnalytics)
	groups.scoped.route(constant.ScopeAnalyticsRead, "POST /api/analytics/custom", s.api.CreateCustomQuery)
	groups.scoped.route(constant.ScopeAnalyticsRead,
		"PATCH /api/analytics/custom/{ref}", s.api.PatchCustomQuery)
	groups.scoped.route(constant.ScopeAnalyticsRead, "GET /api/analytics/custom/{ref}", s.api.RunCustomQuery)
	groups.scoped.route(constant.ScopeDashboardRead, "GET /api/dashboard", s.api.GetDashboard)
	groups.scoped.route(constant.ScopeCategorizationRead,
		"GET /api/categorization/rules", s.api.ListCategorizationRules)
	groups.scoped.route(constant.ScopeCategorizationWrite,
		"POST /api/categorization/rules", s.api.CreateCategorizationRule)
	groups.scoped.route(constant.ScopeCategorizationWrite,
		"PATCH /api/categorization/rules/{ref}", s.api.PatchCategorizationRule)
	groups.scoped.route(constant.ScopeCategorizationRead,
		"GET /api/categorization/suggest", s.api.SuggestCategory)

	groups.scoped.route(constant.ScopeAccountsRead, "GET /api/accounts", s.api.ListAccounts)
	groups.scoped.route(constant.ScopeAccountsWrite, "POST /api/accounts", s.api.CreateAccount)
	groups.scoped.route(constant.ScopeAccountsWrite, "PATCH /api/accounts/{ref}", s.api.PatchAccount)
	groups.scoped.route(constant.ScopePayeesRead, "GET /api/payees", s.api.ListPayees)
	groups.scoped.route(constant.ScopePayeesWrite, "POST /api/payees", s.api.CreatePayee)
	groups.scoped.route(constant.ScopePayeesWrite, "PATCH /api/payees/{ref}", s.api.PatchPayee)
	groups.scoped.route(constant.ScopeRecurringRead, "GET /api/recurring", s.api.ListRecurring)
	groups.scoped.route(constant.ScopeRecurringWrite, "POST /api/recurring", s.api.CreateRecurring)
	groups.scoped.route(constant.ScopeRecurringWrite, "PATCH /api/recurring/{ref}", s.api.PatchRecurring)

	groups.scoped.route(constant.ScopeEntriesRead, "GET /api/entries", s.api.ListEntries)
	groups.scoped.route(constant.ScopeEntriesRead, "GET /api/entries/{ref}", s.api.GetEntry)
	groups.scoped.route(constant.ScopeEntriesWrite, "POST /api/entries", s.api.PostEntry)
	groups.scoped.route(constant.ScopeEntriesWrite, "PATCH /api/entries/{ref}", s.api.PatchEntry)

	groups.scoped.route(constant.ScopeCapturesRead, "GET /api/captures", s.api.ListCaptures)
	groups.scoped.route(constant.ScopeCapturesWrite, "POST /api/captures", s.api.CreateCapture)
	groups.scoped.route(constant.ScopeCapturesWrite, "PATCH /api/captures/{ref}", s.api.PatchCapture)
	groups.scoped.route(constant.ScopeCapturesRead,
		"GET /api/captures/{ref}/artifact", s.api.GetCaptureArtifact)

	groups.scoped.route(constant.ScopeImportsRead, "GET /api/imports", s.api.ListImports)
	groups.scoped.route(constant.ScopeImportsWrite, "POST /api/imports", s.api.CreateImport)
	groups.scoped.route(constant.ScopeImportsRead, "GET /api/imports/{ref}", s.api.GetImport)
	groups.scoped.route(constant.ScopeImportsWrite, "PATCH /api/imports/{ref}", s.api.PatchImport)
	groups.scoped.route(constant.ScopeImportsRead, "GET /api/imports/{ref}/events", s.api.ListImportEvents)
	groups.scoped.route(constant.ScopeImportsWrite,
		"PATCH /api/imports/{ref}/rows/{index}", s.api.PatchImportRow)

	groups.scoped.route(constant.ScopeExportsRead, "GET /api/exports", s.api.ListExports)
	groups.scoped.route(constant.ScopeExportsWrite, "POST /api/exports", s.api.CreateExport)
	groups.scoped.route(constant.ScopeExportsRead, "GET /api/exports/{ref}", s.api.GetExport)
	groups.scoped.route(constant.ScopeExportsRead, "GET /api/exports/{ref}/events", s.api.ListExportEvents)
	groups.scoped.route(constant.ScopeExportsRead, "GET /api/exports/{ref}/download", s.api.DownloadExport)

	groups.scoped.route(constant.ScopeRatesRead, "GET /api/rates", s.api.GetRate)
	groups.scoped.route(constant.ScopeAuditRead, "GET /api/audit", s.api.ListAudit)

	return groups
}

// credentialRoutes mount the surface only the root credential may reach, so no token can
// ever mint a second credential of any kind.
func (s *server) credentialRoutes(group routeGroup) {
	group.route("", "POST /api/password", s.api.ChangePassword)
	group.route("", "PATCH /api/settings", s.api.PatchSettings)
	group.route("", "GET /api/tokens", s.api.ListTokens)
	group.route("", "POST /api/tokens", s.api.CreateToken)
	group.route("", "POST /api/tokens/{ref}/revoke", s.api.RevokeToken)
	group.route("", "GET /api/connections", s.api.GetConnection)
	group.route("", "POST /api/connections/google", s.api.StartConnection)
	group.route("", "POST /api/connections/{ref}/revoke", s.api.RevokeConnection)
	group.route("", "GET /api/intake", s.api.GetIntakeConfig)
	group.route("", "PATCH /api/intake", s.api.PatchIntakeConfig)
	group.route("", "POST /api/intake/run", s.api.RunIntake)
	group.route("", "GET /api/intake/messages", s.api.ListIntakeMessages)
	group.route("", "GET /api/intake/messages/{ref}", s.api.GetIntakeMessage)
	group.route("", "POST /api/intake/messages/{ref}/refresh", s.api.RefreshIntakeMessage)
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
		if patternOf(groups.public.mux, r) != "" {
			groups.public.mux.ServeHTTP(w, r.WithContext(actor.With(r.Context(), userActor(""))))

			return
		}

		who, ok := s.identify(w, r)
		if !ok {
			return
		}

		r = r.WithContext(actor.With(r.Context(), who.actor))

		if patternOf(groups.root.mux, r) != "" {
			if !who.root {
				httpx.WriteError(w, http.StatusForbidden, "forbidden",
					"this route needs the root credential")

				return
			}

			groups.root.mux.ServeHTTP(w, r)

			return
		}

		pattern := patternOf(groups.scoped.mux, r)
		if pattern == "" {
			s.api.NotFound(w, r)

			return
		}

		if !who.root && !who.mayReach(groups.scoped, pattern) {
			httpx.WriteError(w, http.StatusForbidden, "forbidden",
				"this credential cannot reach "+pattern+requiredFor(groups.scoped.scopes[pattern]))

			return
		}

		groups.scoped.mux.ServeHTTP(w, r)
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

	if current.PasswordMustChange && r.URL.Path != "/api/password" && r.URL.Path != "/api/meta" {
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

	root, err := s.settings.Root(ctx, presented)
	if err != nil {
		s.writeInternal(ctx, w, err)

		return credential{}, false
	}

	if root {
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

func (who credential) mayReach(group routeGroup, pattern string) bool {
	scope, delegated := group.scopes[pattern]
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

	connector := connections.New(store, store, process.Sealer, google.New(nil, "", "", ""),
		clock.System{})

	captured := captures.New(
		store, process.Ledger, process.Sealer, process.Artifacts, store, extractor, store,
		clock.System{}, clock.System{},
	)

	intaker := intake.New(store, captured, store, process.Sealer,
		gmailmail.New(nil, "", connector))

	return handlers.Deps{
		Ledger:         process.Ledger,
		Captures:       captured,
		Rates:          process.Rates,
		Accounts:       store,
		Payees:         store,
		Recurring:      store,
		Rules:          store,
		Categorization: categorization.New(store),
		Analytics:      store,
		CustomQueries:  store,
		Artifacts:      store,
		ArtifactFiles:  process.Artifacts,
		ExportFiles:    process.Exports,
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
		Connections:       connector,
		Intake:            intaker,
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
	return config.SelectRail(ctx, cfg, logger)
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
