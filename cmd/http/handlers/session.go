package handlers

import (
	"context"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/tokens"
)

type passwordChangeRequest struct {
	CurrentPassword string              `json:"current_password" validate:"required"`
	NewPassword     string              `json:"new_password"     validate:"required,min=12,max=200"`
	Token           *tokenCreateRequest `json:"token,omitempty"`
}

type passwordChangeResponse struct {
	settingsResponse

	Token *tokenIssuedResponse `json:"token,omitempty"`
}

type settingsPatchRequest struct{}

type settingsResponse struct {
	BaseCurrency      string `json:"base_currency"      maxLength:"3" minLength:"3"`
	Timezone          string `json:"timezone"`
	ExtractionEnabled bool   `json:"extraction_enabled"`
	AIAssistance      bool   `json:"ai_assistance"`
}

// @Summary     Replace the instance password
// @Description Root credential only. The old password must match; the new one is at least 12 characters and is stored as a PBKDF2 hash inside the sealed settings row. An optional `token` mints the browser credential in the same call; like `POST /api/tokens`, the plaintext exists exactly once, in this response.
// @Tags        settings
// @Accept      json
// @Param       body body passwordChangeRequest true "the request body"
// @Produce     json
// @Success     200 {object} passwordChangeResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/password [post]
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

	response := passwordChangeResponse{
		settingsResponse: toSettingsResponse(settings, s.deps.ExtractionEnabled, s.deps.AIAssistance),
	}

	if request.Token != nil {
		issued, tokenErr := s.issueToken(ctx, *request.Token)
		if tokenErr != nil {
			s.writeClassified(ctx, w, tokenErr)

			return
		}

		response.Token = &issued
	}

	httpx.WriteJSON(w, http.StatusOK, response)
}

func (s *Server) issueToken(ctx context.Context, request tokenCreateRequest) (tokenIssuedResponse, error) {
	token, plain, err := s.deps.Tokens.Create(ctx, tokens.CreateInput{
		Name:      request.Name,
		Scopes:    request.Scopes,
		ExpiresAt: request.ExpiresAt,
	})
	if err != nil {
		return tokenIssuedResponse{}, err
	}

	return tokenIssuedResponse{tokenResponse: toTokenResponse(token), Token: plain}, nil
}

// @Summary     Discover that no setting is patchable
// @Description The base currency and the timezone are fixed at the first boot: this route answers `422 empty_patch` and changes nothing.
// @Tags        settings
// @Accept      json
// @Param       body body settingsPatchRequest true "the request body"
// @Produce     json
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody "empty_patch"
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/settings [patch]
func (s *Server) PatchSettings(w http.ResponseWriter, r *http.Request) {
	_, endSpan := telemetry.StartSpan(r.Context(), "Handler.Settings.Patch")
	defer endSpan()

	var request settingsPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	httpx.WriteError(w, http.StatusUnprocessableEntity, "empty_patch", "nothing to change")
}

// @Summary     The in-app settings the shell reads
// @Description Never carries the password hash or the secret. `extraction_enabled` and `ai_assistance` say which rails are wired.
// @Tags        settings
// @Produce     json
// @Success     200 {object} settingsResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/settings [get]
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
		BaseCurrency:      settings.BaseCurrency,
		Timezone:          settings.Timezone,
		ExtractionEnabled: extraction,
		AIAssistance:      ai,
	}
}
