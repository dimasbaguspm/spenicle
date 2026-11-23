// Package httpapi is the driving adapter: HTTP in, use cases out.
package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/port"
	"github.com/dimasbaguspm/spenicle/internal/usecase/ledger"
)

// Deps is everything the transport needs, injected.
type Deps struct {
	Ledger       *ledger.Service
	Health       port.Health
	Sealer       port.Sealer
	BaseCurrency string
	Logger       *slog.Logger
}

// Server owns the routes and the middleware chain.
type Server struct {
	deps Deps
	mux  *http.ServeMux
}

// New registers every route explicitly. Nothing is implicit.
func New(deps Deps) *Server {
	if deps.Logger == nil {
		deps.Logger = slog.Default()
	}

	s := &Server{deps: deps, mux: http.NewServeMux()}

	s.mux.HandleFunc("GET /healthz", s.handleHealth)
	s.mux.HandleFunc("POST /api/entries", s.handlePostEntry)
	s.mux.HandleFunc("/", s.handleNotFound)

	return s
}

// Handler returns the mux wrapped in the middleware chain.
func (s *Server) Handler() http.Handler {
	return chain(s.mux,
		s.recoverPanic,
		s.observe,
		s.logRequests,
	)
}

func chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

func (s *Server) handleNotFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "no route for "+r.Method+" "+r.URL.Path)
}

// statusRecorder lets middleware see what the handler decided.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(b)
	r.bytes += n
	return n, err
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		s.deps.Logger.Info("http",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"bytes", rec.bytes,
			"duration_ms", time.Since(start).Milliseconds())
	})
}

func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				s.deps.Logger.Error("panic", "value", v, "path", r.URL.Path)
				writeError(w, http.StatusInternalServerError, "internal_error", "unexpected failure")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
