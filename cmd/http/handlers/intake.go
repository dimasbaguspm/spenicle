package handlers

import (
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
)

type intakeConfigRequest struct {
	Enabled   bool     `json:"enabled"`
	Allowlist []string `json:"allowlist" validate:"omitempty,max=50,dive,max=200"`
}

type intakeConfigResponse struct {
	Enabled   bool     `json:"enabled"`
	Allowlist []string `json:"allowlist"`
}

type intakeResultResponse struct {
	Created   int `json:"created"`
	Skipped   int `json:"skipped"`
	Failed    int `json:"failed"`
	Unchanged int `json:"unchanged"`
}

type mailMessageResponse struct {
	Ref              string `json:"ref"`
	Source           string `json:"source"`
	MessageRef       string `json:"message_ref"`
	ThreadRef        string `json:"thread_ref,omitempty"`
	MessageIDHeader  string `json:"message_id_header,omitempty"`
	ProviderRevision string `json:"provider_revision,omitempty"`
	ReceivedAt       string `json:"received_at"`
	ObservedAt       string `json:"observed_at"`
	Status           string `json:"status"`
	SkipReason       string `json:"skip_reason,omitempty"`
	CaptureRef       string `json:"capture_ref,omitempty"`
	SupersededBy     string `json:"superseded_by,omitempty"`
	LastSyncedAt     string `json:"last_synced_at,omitempty"`
}

func (s *Server) GetIntakeConfig(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.GetConfig")
	defer endSpan()

	config, err := s.deps.Intake.Config(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, intakeConfigResponse{
		Enabled: config.Enabled, Allowlist: nonNil(config.Allowlist),
	})
}

func (s *Server) PatchIntakeConfig(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.PatchConfig")
	defer endSpan()

	var request intakeConfigRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	config, err := s.deps.Intake.Configure(ctx, intake.Config{
		Enabled: request.Enabled, Allowlist: request.Allowlist,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, intakeConfigResponse{
		Enabled: config.Enabled, Allowlist: nonNil(config.Allowlist),
	})
}

func (s *Server) RunIntake(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.Run")
	defer endSpan()

	result, err := s.deps.Intake.Poll(ctx, time.Now().UTC())
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, intakeResultResponse{
		Created: result.Created, Skipped: result.Skipped, Failed: result.Failed,
		Unchanged: result.Unchanged,
	})
}

func (s *Server) GetIntakeMessage(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.GetMessage")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	message, found, err := s.deps.Intake.MessageByRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no mail message with that ref")

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toMailMessageResponse(message))
}

func (s *Server) RefreshIntakeMessage(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.RefreshMessage")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	message, err := s.deps.Intake.Refresh(ctx, path.Ref, time.Now().UTC())
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toMailMessageResponse(message))
}

func toMailMessageResponse(message entity.MailMessage) mailMessageResponse {
	response := mailMessageResponse{
		Ref:              message.Ref,
		Source:           message.Source,
		MessageRef:       message.MessageRef,
		ThreadRef:        message.ThreadRef,
		MessageIDHeader:  message.MessageIDHeader,
		ProviderRevision: message.ProviderRevision,
		ReceivedAt:       message.ReceivedAt.Format(time.RFC3339),
		ObservedAt:       message.ObservedAt.Format(time.RFC3339),
		Status:           message.Status,
		SkipReason:       message.SkipReason,
		SupersededBy:     message.SupersededBy,
	}

	if !message.LastSyncedAt.IsZero() {
		response.LastSyncedAt = message.LastSyncedAt.Format(time.RFC3339)
	}

	return response
}

func nonNil(values []string) []string {
	if values == nil {
		return []string{}
	}

	return values
}
