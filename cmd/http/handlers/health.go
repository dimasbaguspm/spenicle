package handlers

import (
	"context"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type healthResponse struct {
	Status          string `json:"status"`
	Version         string `json:"version"`
	SchemaVersion   int    `json:"schema_version"`
	AppSecret       string `json:"app_secret"`
	BaseCurrency    string `json:"base_currency"`
	WorkerLastRunAt string `json:"worker_last_run_at"`
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Health.Check")
	defer endSpan()

	ctx, cancel := context.WithTimeout(ctx, s.deps.HealthTimeout)
	defer cancel()

	schemaVersion, err := s.deps.Health.SchemaVersion(ctx)
	if err == nil {
		err = s.deps.Health.Ping(ctx)
	}

	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "degraded", err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, healthResponse{
		Status:          "ok",
		Version:         s.deps.Version,
		SchemaVersion:   schemaVersion,
		AppSecret:       s.deps.Sealer.Fingerprint(),
		BaseCurrency:    s.deps.BaseCurrency,
		WorkerLastRunAt: s.workerLastRunAt(),
	})
}

func (s *server) workerLastRunAt() string {
	if s.deps.WorkerLastRun == nil {
		return ""
	}

	last := s.deps.WorkerLastRun()
	if last.IsZero() {
		return ""
	}

	return last.Format(constant.TimestampLayout)
}
