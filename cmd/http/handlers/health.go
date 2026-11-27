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
	StartedAt       string `format:"date-time"    json:"started_at"`
	SchemaVersion   int    `json:"schema_version"`
	AppSecret       string `json:"app_secret"`
	BaseCurrency    string `json:"base_currency"  maxLength:"3"             minLength:"3"`
	Timezone        string `json:"timezone"`
	WorkerLastRunAt string `format:"date-time"    json:"worker_last_run_at"`
}

// @Summary     Liveness, build and schema fingerprint
// @Description Answers `degraded` when the store cannot be reached. The `app_secret` value is a fingerprint, never the secret. Public route: no credential is read.
// @Tags        system
// @Produce     json
// @Success     200 {object} healthResponse
// @Failure     503 {object} httpx.ErrorBody
// @Router      /healthz [get]
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

	baseCurrency, err := s.deps.Settings.BaseCurrency(ctx)
	if err != nil {
		return healthResponse{}, err
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
		BaseCurrency:    baseCurrency,
		Timezone:        s.deps.Timezone,
		WorkerLastRunAt: lastRun,
	}, nil
}
