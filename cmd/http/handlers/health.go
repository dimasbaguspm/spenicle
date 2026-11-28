package handlers

import (
	"context"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

type healthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// @Summary     Liveness: ping the store, name the build
// @Description A probe, not a dashboard: `status` is `ok` while the store answers, and `version` is `<tag>+<sha7>` (or `dev`). Everything else this route used to publish — the schema version, the boot time, the worker heartbeat, the currency and the timezone — is boot state, and boot state lives in `GET /api/bootstrap`; the sealed secret's fingerprint is a credential-owned fact and lives in `GET /api/meta`. Public route: no credential is read.
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
	if err := s.deps.Health.Ping(ctx); err != nil {
		return healthResponse{}, err
	}

	return healthResponse{Status: "ok", Version: s.deps.Version}, nil
}
