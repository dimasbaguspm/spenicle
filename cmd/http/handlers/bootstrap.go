package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type bootstrapResponse struct {
	SetupCompleted    bool   `json:"setup_completed"`
	BaseCurrency      string `json:"base_currency"      maxLength:"3" minLength:"3"`
	Timezone          string `json:"timezone"`
	ExtractionEnabled bool   `json:"extraction_enabled"`
	AIAssistance      bool   `json:"ai_assistance"`
}

// @Summary     Public boot state: has this instance been claimed yet?
// @Description The one read a client needs before it holds a credential. A fresh instance boots open and unprotected until `POST /api/setup` sets its password and base currency, so `setup_completed` is the whole answer: false means the setup screen, true means the sign-in screen. No credential, no account, no amount and no secret is read.
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

	httpx.WriteJSON(w, http.StatusOK, bootstrapResponse{
		SetupCompleted:    completed,
		BaseCurrency:      settings.BaseCurrency,
		Timezone:          settings.Timezone,
		ExtractionEnabled: s.deps.ExtractionEnabled,
		AIAssistance:      s.deps.AIAssistance,
	})
}
