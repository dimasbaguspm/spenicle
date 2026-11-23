package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

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

	token, err := s.deps.Settings.SessionToken(ctx)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())

		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     constant.SessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   r.TLS != nil,
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
	})

	httpx.WriteJSON(w, http.StatusOK, sessionResponse{
		Status:     "signed_in",
		MustChange: settings.PasswordMustChange,
	})
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
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

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
			status, code := classify(err)
			httpx.WriteError(w, status, code, err.Error())

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
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

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
		if r.URL.Path == "/api/session" || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)

			return
		}

		settings, err := s.deps.Settings.Load(r.Context())
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())

			return
		}

		if settings.Password == "" {
			next.ServeHTTP(w, r)

			return
		}

		token, err := s.deps.Settings.SessionToken(r.Context())
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "internal_error", err.Error())

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
