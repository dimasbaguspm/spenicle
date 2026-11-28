package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type bootstrapResponse struct {
	SetupCompleted    bool   `json:"setup_completed"`
	Claimable         bool   `json:"claimable"`
	BaseCurrency      string `json:"base_currency"      maxLength:"3"             minLength:"3"`
	Timezone          string `json:"timezone"`
	ExtractionEnabled bool   `json:"extraction_enabled"`
	AIAssistance      bool   `json:"ai_assistance"`
	Version           string `json:"version"`
	StartedAt         string `format:"date-time"        json:"started_at"`
	SchemaVersion     int    `json:"schema_version"`
	WorkerLastRunAt   string `format:"date-time"        json:"worker_last_run_at"`
}

// @Summary     Public boot state: has this instance been claimed yet?
// @Description The one read a client needs before it holds a credential. `setup_completed` reports the `POST /api/setup` marker itself: false means the setup never finished, true means it did. `claimable` answers the question a client actually acts on — can this instance still be claimed? — and it is false the moment a password is stored, because that is when the identity middleware stops treating every request as the root credential. It also carries the boot state `/healthz` used to publish: `version`, `started_at`, `schema_version` and the worker's `worker_last_run_at`. No account, no amount and no secret is read; the sealed secret's fingerprint is a credential-owned fact and lives in `GET /api/meta`.
// @Tags        system
// @Produce     json
// @Success     200 {object} bootstrapResponse
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/bootstrap [get]
func (s *Server) Bootstrap(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Bootstrap.Get")
	defer endSpan()

	settings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	_, completed, err := s.deps.Health.Setting(ctx, constant.SettingSetupCompletedAt)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	schemaVersion, err := s.deps.Health.SchemaVersion(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	lastRun, _, err := s.deps.Health.Setting(ctx, constant.SettingWorkerLastRunAt)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, bootstrapResponse{
		SetupCompleted:    completed,
		Claimable:         !settings.HasPassword(),
		BaseCurrency:      settings.BaseCurrency,
		Timezone:          settings.Timezone,
		ExtractionEnabled: s.deps.ExtractionEnabled,
		AIAssistance:      s.deps.AIAssistance,
		Version:           s.deps.Version,
		StartedAt:         s.deps.StartedAt.UTC().Format(constant.TimestampLayout),
		SchemaVersion:     schemaVersion,
		WorkerLastRunAt:   lastRun,
	})
}
