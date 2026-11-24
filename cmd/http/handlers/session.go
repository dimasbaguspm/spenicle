package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type passwordChangeRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password"     validate:"required,min=12,max=200"`
}

type settingsPatchRequest struct{}

type settingsResponse struct {
	BaseCurrency       string `json:"base_currency"`
	Timezone           string `json:"timezone"`
	PasswordMustChange bool   `json:"password_must_change"`
	ExtractionEnabled  bool   `json:"extraction_enabled"`
	AIAssistance       bool   `json:"ai_assistance"`
}

func (s *Server) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Session.ChangePassword")
	defer endSpan()

	var request passwordChangeRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	settings, err := s.deps.Settings.ChangePassword(ctx, request.CurrentPassword, request.NewPassword)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	s.writeSettings(w, settings)
}

func (s *Server) PatchSettings(w http.ResponseWriter, r *http.Request) {
	_, endSpan := telemetry.StartSpan(r.Context(), "Handler.Settings.Patch")
	defer endSpan()

	var request settingsPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	httpx.WriteError(w, http.StatusUnprocessableEntity, "empty_patch", "nothing to change")
}

func (s *Server) GetSettings(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Settings.Get")
	defer endSpan()

	settings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	s.writeSettings(w, settings)
}

func (s *Server) writeSettings(w http.ResponseWriter, settings entity.Settings) {
	httpx.WriteJSON(w, http.StatusOK,
		toSettingsResponse(settings, s.deps.ExtractionEnabled, s.deps.AIAssistance))
}

func toSettingsResponse(settings entity.Settings, extraction, ai bool) settingsResponse {
	return settingsResponse{
		BaseCurrency:       settings.BaseCurrency,
		Timezone:           settings.Timezone,
		PasswordMustChange: settings.PasswordMustChange,
		ExtractionEnabled:  extraction,
		AIAssistance:       ai,
	}
}
