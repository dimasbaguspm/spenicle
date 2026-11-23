package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const sessionTTL = 30 * 24 * time.Hour

type sessionRequest struct {
	Password string `json:"password" validate:"required"`
}

type sessionResponse struct {
	Status     string `json:"status"`
	MustChange bool   `json:"must_change"`
}

type signInResponse struct {
	Status            string `json:"status"`
	MustChange        bool   `json:"must_change"`
	BaseCurrency      string `json:"base_currency"`
	Timezone          string `json:"timezone"`
	ExtractionEnabled bool   `json:"extraction_enabled"`
	AIAssistance      bool   `json:"ai_assistance"`
}

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

func (s *Server) Session(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Session.Create")
	defer endSpan()

	var request sessionRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	settings, found, err := s.deps.Settings.Authenticate(ctx, request.Password)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "invalid_password", "password does not match")

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusConflict, "no_password_set",
			"this instance runs in open mode: no password has been set yet")

		return
	}

	if err := s.issueSession(ctx, w, r); err != nil {
		s.InternalError(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, signInResponse{
		Status:            "signed_in",
		MustChange:        settings.PasswordMustChange,
		BaseCurrency:      settings.BaseCurrency,
		Timezone:          settings.Timezone,
		ExtractionEnabled: s.deps.ExtractionEnabled,
		AIAssistance:      s.deps.AIAssistance,
	})
}

func (s *Server) DestroySession(w http.ResponseWriter, r *http.Request) {
	_, endSpan := telemetry.StartSpan(r.Context(), "Handler.Session.Destroy")
	defer endSpan()

	s.clearSession(w, r)

	httpx.WriteJSON(w, http.StatusOK, sessionResponse{Status: "signed_out"})
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

	if err := s.issueSession(ctx, w, r); err != nil {
		s.InternalError(ctx, w, err)

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

func (s *Server) issueSession(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	token, err := s.deps.Settings.SessionToken(ctx)
	if err != nil {
		return err
	}

	s.writeSession(w, r, token, int(sessionTTL.Seconds()))

	return nil
}

func (s *Server) clearSession(w http.ResponseWriter, r *http.Request) {
	s.writeSession(w, r, "", -1)
}

func (s *Server) writeSession(w http.ResponseWriter, r *http.Request, value string, maxAge int) {
	w.Header().Add("Cache-Control", "no-store")

	http.SetCookie(w, &http.Cookie{
		Name:     constant.SessionCookie,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   requestIsSecure(r),
		MaxAge:   maxAge,
	})
}

func requestIsSecure(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")), "https")
}
