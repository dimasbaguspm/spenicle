package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type bootstrapResponse struct {
	SetupCompleted     bool   `json:"setup_completed"`
	PasswordMustChange bool   `json:"password_must_change"`
	BaseCurrency       string `json:"base_currency"        maxLength:"3" minLength:"3"`
	Timezone           string `json:"timezone"`
	ExtractionEnabled  bool   `json:"extraction_enabled"`
	AIAssistance       bool   `json:"ai_assistance"`
}

// @Summary     Public boot state: is the ledger opened, is the password still the generated one?
// @Description The one read a client needs before it holds a credential. It answers in open mode, in gate mode and in normal mode, and it never carries a credential, an account, an amount or a secret. `setup_completed` says whether `POST /api/setup` still has to run, `password_must_change` whether the first-boot password still has to be replaced.
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
		SetupCompleted:     completed,
		PasswordMustChange: settings.PasswordMustChange,
		BaseCurrency:       settings.BaseCurrency,
		Timezone:           settings.Timezone,
		ExtractionEnabled:  s.deps.ExtractionEnabled,
		AIAssistance:       s.deps.AIAssistance,
	})
}
