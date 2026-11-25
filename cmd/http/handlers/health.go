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
	StartedAt       string `json:"started_at"`
	SchemaVersion   int    `json:"schema_version"`
	AppSecret       string `json:"app_secret"`
	BaseCurrency    string `json:"base_currency"`
	Timezone        string `json:"timezone"`
	WorkerLastRunAt string `json:"worker_last_run_at"`
}

func (s *Server) Health(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Health.Check")
	defer endSpan()

	ctx, cancel := context.WithTimeout(ctx, s.deps.HealthTimeout)
	defer cancel()

	response, err := s.health(ctx)
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "degraded", err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, response)
}

func (s *Server) health(ctx context.Context) (healthResponse, error) {
	schemaVersion, err := s.deps.Health.SchemaVersion(ctx)
	if err != nil {
		return healthResponse{}, err
	}

	if pingErr := s.deps.Health.Ping(ctx); pingErr != nil {
		return healthResponse{}, pingErr
	}

	lastRun, _, err := s.deps.Health.Setting(ctx, constant.SettingWorkerLastRunAt)
	if err != nil {
		return healthResponse{}, err
	}

	return healthResponse{
		Status:          "ok",
		Version:         s.deps.Version,
		StartedAt:       s.deps.StartedAt.UTC().Format(constant.TimestampLayout),
		SchemaVersion:   schemaVersion,
		AppSecret:       s.deps.Sealer.Fingerprint(),
		BaseCurrency:    s.deps.BaseCurrency,
		Timezone:        s.deps.Timezone,
		WorkerLastRunAt: lastRun,
	}, nil
}
