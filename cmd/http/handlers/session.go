package handlers

import (
	"context"
	"net/http"
	"net/url"
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

type passwordChangeRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password"     validate:"required,min=12,max=200"`
}

type settingsPatchRequest struct {
	BaseCurrency *string `json:"base_currency,omitempty" validate:"omitempty,currency"`
}

type settingsResponse struct {
	BaseCurrency       string `json:"base_currency"`
	PasswordMustChange bool   `json:"password_must_change"`
	ExtractionEnabled  bool   `json:"extraction_enabled"`
}

func (s *server) handleSession(w http.ResponseWriter, r *http.Request) {
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
		s.writeInternal(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, sessionResponse{
		Status:     "signed_in",
		MustChange: settings.PasswordMustChange,
	})
}

func (s *server) handleDestroySession(w http.ResponseWriter, r *http.Request) {
	_, endSpan := telemetry.StartSpan(r.Context(), "Handler.Session.Destroy")
	defer endSpan()

	s.clearSession(w, r)

	httpx.WriteJSON(w, http.StatusOK, sessionResponse{Status: "signed_out"})
}

func (s *server) handlePasswordChange(w http.ResponseWriter, r *http.Request) {
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
		s.writeInternal(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toSettingsResponse(settings))
}

func (s *server) handlePatchSettings(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Settings.Patch")
	defer endSpan()

	var request settingsPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	if request.BaseCurrency != nil {
		settings, err := s.deps.Settings.SetBaseCurrency(ctx, *request.BaseCurrency)
		if err != nil {
			s.writeClassified(ctx, w, err)

			return
		}

		httpx.WriteJSON(w, http.StatusOK, toSettingsResponse(settings))

		return
	}

	httpx.WriteError(w, http.StatusUnprocessableEntity, "empty_patch", "nothing to change")
}

func (s *server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Settings.Get")
	defer endSpan()

	settings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toSettingsResponse(settings))
}

func toSettingsResponse(settings entity.Settings) settingsResponse {
	return settingsResponse{
		BaseCurrency:       settings.BaseCurrency,
		PasswordMustChange: settings.PasswordMustChange,
		ExtractionEnabled:  settings.ExtractionEnabled,
	}
}

func (s *server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || r.URL.Path == "/api/session" ||
			r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)

			return
		}

		if !s.crossOriginAllowed(r) {
			httpx.WriteError(w, http.StatusForbidden, "cross_origin_denied",
				"this request came from another origin and was refused")

			return
		}

		settings, err := s.deps.Settings.Load(r.Context())
		if err != nil {
			s.writeInternal(r.Context(), w, err)

			return
		}

		if !settings.HasPassword() {
			next.ServeHTTP(w, r)

			return
		}

		if settings.PasswordMustChange && r.URL.Path != "/api/password" {
			httpx.WriteError(w, http.StatusConflict, "password_change_required",
				"sign in with the generated password, then set your own at /api/password")

			return
		}

		token, err := s.deps.Settings.SessionToken(r.Context())
		if err != nil {
			s.writeInternal(r.Context(), w, err)

			return
		}

		cookie, err := r.Cookie(constant.SessionCookie)
		if err != nil || strings.TrimSpace(cookie.Value) != token {
			httpx.WriteError(w, http.StatusUnauthorized, "unauthorized", "sign in first")

			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *server) issueSession(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	token, err := s.deps.Settings.SessionToken(ctx)
	if err != nil {
		return err
	}

	s.writeSession(w, r, token, int(sessionTTL.Seconds()))

	return nil
}

func (s *server) clearSession(w http.ResponseWriter, r *http.Request) {
	s.writeSession(w, r, "", -1)
}

func (s *server) writeSession(w http.ResponseWriter, r *http.Request, value string, maxAge int) {
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

func (s *server) crossOriginAllowed(r *http.Request) bool {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	}

	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	if strings.EqualFold(parsed.Host, r.Host) {
		return true
	}

	return s.deps.WebOrigin != "" && strings.EqualFold(origin, s.deps.WebOrigin)
}
