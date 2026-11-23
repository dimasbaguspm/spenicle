package httpcmd

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/dimasbaguspm/spenicle/cmd/http/handlers"
	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
)

type server struct {
	api       *handlers.Server
	settings  settings.Contract
	logger    *slog.Logger
	webOrigin string
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
		deps.Logger = slog.Default()
	}

	instance := &server{
		api:       handlers.New(deps),
		settings:  deps.Settings,
		logger:    deps.Logger,
		webOrigin: deps.WebOrigin,
	}

	return httpx.Chain(instance.requireSession(instance.routes()),
		httpx.CORS(deps.WebOrigin),
		httpx.Recover(deps.Logger),
		httpx.Observe(),
		httpx.Log(deps.Logger),
	)
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", s.api.Health)

	mux.HandleFunc("POST /api/session", s.api.Session)
	mux.HandleFunc("DELETE /api/session", s.api.DestroySession)
	mux.HandleFunc("GET /api/settings", s.api.GetSettings)
	mux.HandleFunc("PATCH /api/settings", s.api.PatchSettings)
	mux.HandleFunc("POST /api/password", s.api.ChangePassword)

	mux.HandleFunc("GET /api/meta", s.api.GetMeta)
	mux.HandleFunc("GET /api/analytics/months", s.api.MonthlyAnalytics)
	mux.HandleFunc("GET /api/analytics/categories", s.api.CategoryAnalytics)
	mux.HandleFunc("POST /api/analytics/custom", s.api.CreateCustomQuery)
	mux.HandleFunc("PATCH /api/analytics/custom/{ref}", s.api.PatchCustomQuery)
	mux.HandleFunc("GET /api/analytics/custom/{ref}", s.api.RunCustomQuery)
	mux.HandleFunc("GET /api/dashboard", s.api.GetDashboard)
	mux.HandleFunc("POST /api/setup", s.api.Setup)

	mux.HandleFunc("GET /api/accounts", s.api.ListAccounts)
	mux.HandleFunc("POST /api/accounts", s.api.CreateAccount)
	mux.HandleFunc("PATCH /api/accounts/{ref}", s.api.PatchAccount)
	mux.HandleFunc("GET /api/payees", s.api.ListPayees)
	mux.HandleFunc("POST /api/payees", s.api.CreatePayee)
	mux.HandleFunc("PATCH /api/payees/{ref}", s.api.PatchPayee)
	mux.HandleFunc("GET /api/recurring", s.api.ListRecurring)
	mux.HandleFunc("POST /api/recurring", s.api.CreateRecurring)
	mux.HandleFunc("PATCH /api/recurring/{ref}", s.api.PatchRecurring)

	mux.HandleFunc("GET /api/entries", s.api.ListEntries)
	mux.HandleFunc("POST /api/entries", s.api.PostEntry)
	mux.HandleFunc("PATCH /api/entries/{ref}", s.api.PatchEntry)

	mux.HandleFunc("GET /api/captures", s.api.ListCaptures)
	mux.HandleFunc("POST /api/captures", s.api.CreateCapture)
	mux.HandleFunc("PATCH /api/captures/{ref}", s.api.PatchCapture)
	mux.HandleFunc("GET /api/captures/{ref}/artifact", s.api.GetCaptureArtifact)
	mux.HandleFunc("GET /api/imports", s.api.ListImports)
	mux.HandleFunc("POST /api/imports", s.api.CreateImport)
	mux.HandleFunc("GET /api/imports/{ref}", s.api.GetImport)
	mux.HandleFunc("PATCH /api/imports/{ref}", s.api.PatchImport)
	mux.HandleFunc("GET /api/imports/{ref}/events", s.api.ListImportEvents)
	mux.HandleFunc("PATCH /api/imports/{ref}/rows/{index}", s.api.PatchImportRow)

	mux.HandleFunc("GET /api/exports", s.api.ListExports)
	mux.HandleFunc("POST /api/exports", s.api.CreateExport)
	mux.HandleFunc("GET /api/exports/{ref}", s.api.GetExport)
	mux.HandleFunc("GET /api/exports/{ref}/events", s.api.ListExportEvents)
	mux.HandleFunc("GET /api/exports/{ref}/download", s.api.DownloadExport)

	mux.HandleFunc("GET /api/rates", s.api.GetRate)

	mux.HandleFunc("/", s.api.NotFound)

	return mux
}

func (s *server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || r.URL.Path == "/api/session" ||
			r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)

			return
		}

		if !s.crossOriginAllowed(r) {
			httpx.WriteError(w, http.StatusForbidden, "cross_origin_denied",
				"this request came from another origin and was refused")

			return
		}

		current, err := s.settings.Load(r.Context())
		if err != nil {
			s.writeInternal(r.Context(), w, err)

			return
		}

		if !current.HasPassword() {
			next.ServeHTTP(w, r)

			return
		}

		if current.PasswordMustChange && r.URL.Path != "/api/password" {
			httpx.WriteError(w, http.StatusConflict, "password_change_required",
				"sign in with the generated password, then set your own at /api/password")

			return
		}

		token, err := s.settings.SessionToken(r.Context())
		if err != nil {
			s.writeInternal(r.Context(), w, err)

			return
		}

		cookie, err := r.Cookie(constant.SessionCookie)
		if err != nil || strings.TrimSpace(cookie.Value) != token {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "sign in first")

			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *server) crossOriginAllowed(r *http.Request) bool {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	}

	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	if strings.EqualFold(parsed.Host, r.Host) {
		return true
	}

	return s.webOrigin != "" && strings.EqualFold(origin, s.webOrigin)
}

func (s *server) writeInternal(ctx context.Context, w http.ResponseWriter, err error) {
	s.logger.ErrorContext(ctx, "request failed", slog.String("error", err.Error()))
	httpx.WriteError(w, http.StatusInternalServerError, "internal_error", "internal error")
}

func buildDeps(ctx context.Context, process *config.Process) (handlers.Deps, error) {
	extractor, err := buildExtractor(ctx, process)
	if err != nil {
		return handlers.Deps{}, err
	}

	store := process.Store

	return handlers.Deps{
		Ledger: process.Ledger,
		Captures: captures.New(
			store, process.Ledger, process.Sealer, process.Artifacts, store, extractor,
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
		Exports: exports.New(
			store, store, store, process.Artifacts, process.Cfg.ExportRetention, clock.System{},
		),
		Settings: process.Settings,
		Imports: imports.New(
			store, store, store, store, process.Ledger, process.Artifacts, process.Settings, clock.System{},
		),
		Health:            store,
		Sealer:            process.Sealer,
		BaseCurrency:      process.BaseCurrency,
		Version:           config.Version,
		HealthTimeout:     process.Cfg.HealthTimeout,
		MaxBodyBytes:      process.Cfg.MaxBodyBytes,
		MaxArtifactBytes:  process.Cfg.ArtifactMaxBytes,
		WebOrigin:         process.Cfg.WebOrigin,
		ExtractionEnabled: process.Cfg.SnapToJSONAPIKey != "",
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
	logger *slog.Logger,
) (extraction.Extractor, error) {
	if cfg.SnapToJSONAPIKey != "" {
		rail, err := snaptojson.New(cfg.SnapToJSONEndpoint, cfg.SnapToJSONAPIKey, cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("snaptojson rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	if cfg.OpenAIAPIKey != "" {
		rail, err := openai.New(cfg.OpenAIAPIKey, cfg.OpenAIModel, "", cfg.SnapToJSONTimeout)
		if err != nil {
			return nil, fmt.Errorf("openai rail: %w", err)
		}

		logger.InfoContext(ctx, "extraction rail enabled", slog.String("rail", rail.Rail()))

		return rail, nil
	}

	logger.InfoContext(ctx, "no extraction rail configured: captures stay manual")

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
		process.Logger.InfoContext(ctx, "listening",
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
		process.Logger.InfoContext(ctx, "shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}
