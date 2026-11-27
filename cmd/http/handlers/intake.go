package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
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

type mailMessageQuery struct {
	Status string `query:"status" validate:"omitempty,oneof=captured skipped failed gone"`
	Source string `query:"source" validate:"omitempty,oneof=imap gmail"`
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
}

type mailMessageResponse struct {
	Ref              string `json:"ref"                         pattern:"^[0-9a-f]{32}$"`
	Source           string `json:"source"`
	Handle           string `json:"handle"`
	ThreadRef        string `json:"thread_ref,omitempty"`
	MessageIDHeader  string `json:"message_id_header,omitempty"`
	ProviderRevision string `json:"provider_revision,omitempty"`
	ReceivedAt       string `format:"date-time"                 json:"received_at"`
	ObservedAt       string `format:"date-time"                 json:"observed_at"`
	Status           string `json:"status"`
	SkipReason       string `json:"skip_reason,omitempty"`
	CaptureRef       string `json:"capture_ref,omitempty"       pattern:"^[0-9a-f]{32}$"`
	SupersededBy     string `json:"superseded_by,omitempty"     pattern:"^[0-9a-f]{32}$"`
	LastSyncedAt     string `format:"date-time"                 json:"last_synced_at,omitempty"`
}

// @Summary     The intake configuration, never its secrets
// @Description Whether polling is on and which senders are allowed; the mailbox credentials stay sealed.
// @Tags        intake
// @Produce     json
// @Success     200 {object} intakeConfigResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake [get]
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

// @Summary     Turn polling on, set the sender allowlist
// @Description Absolute values only: the whole allowlist is replaced. The worker polls on its next run.
// @Tags        intake
// @Accept      json
// @Param       body body intakeConfigRequest true "the request body"
// @Produce     json
// @Success     200 {object} intakeConfigResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake [patch]
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

// @Summary     Poll the mailbox now
// @Description Same path the worker runs. Every message either becomes a capture or is recorded with its skip reason; nothing is posted to the ledger.
// @Tags        intake
// @Produce     json
// @Success     200 {object} intakeResultResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake/run [post]
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

// @Summary     Every message seen by intake
// @Description Newest first, one row per observed message, each carrying the capture it produced.
// @Tags        intake
// @Produce     json
// @Param       status query string false "captured, skipped, failed or gone"
// @Param       source query string false "imap or gmail"
// @Param       cursor query string false "return messages after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{messages=[]mailMessageResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake/messages [get]
//
//nolint:dupl // the bind, filter and writeList shape is the list idiom, one per route
func (s *Server) ListIntakeMessages(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Intake.ListMessages")
	defer endSpan()

	var query mailMessageQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	filter := entity.MailMessageFilter{
		Status: query.Status,
		Source: query.Source,
		Cursor: query.Cursor,
		Limit:  list.ClampLimit(query.Limit),
	}

	writeList(ctx, w, s, "messages", filter.Limit,
		func() ([]entity.MailMessage, error) { return s.deps.Intake.Messages(ctx, filter) },
		func(message entity.MailMessage) string { return message.Ref },
		toMailMessageResponse,
	)
}

// @Summary     One observed message and the capture it produced
// @Description The handle and message id are kept as evidence; the body is not stored here.
// @Tags        intake
// @Produce     json
// @Param       ref path string true "message ref"
// @Success     200 {object} mailMessageResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake/messages/{ref} [get]
func (s *Server) GetIntakeMessage(w http.ResponseWriter, r *http.Request) {
	s.serveIntakeMessage(w, r, "Handler.Intake.GetMessage", s.deps.Intake.MessageByRef)
}

// @Summary     Re-read one message from the provider
// @Description Re-runs the sync for one handle; a superseded message stays in the listing.
// @Tags        intake
// @Produce     json
// @Param       ref path string true "message ref"
// @Success     200 {object} mailMessageResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/intake/messages/{ref}/refresh [post]
func (s *Server) RefreshIntakeMessage(w http.ResponseWriter, r *http.Request) {
	s.serveIntakeMessage(w, r, "Handler.Intake.RefreshMessage",
		func(ctx context.Context, ref string) (entity.MailMessage, bool, error) {
			message, err := s.deps.Intake.Refresh(ctx, ref, time.Now().UTC())

			return message, err == nil, err
		})
}

func (s *Server) serveIntakeMessage(
	w http.ResponseWriter,
	r *http.Request,
	span string,
	load func(ctx context.Context, ref string) (entity.MailMessage, bool, error),
) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), span)
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	message, found, err := load(ctx, path.Ref)
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

func toMailMessageResponse(message entity.MailMessage) mailMessageResponse {
	response := mailMessageResponse{
		Ref:              message.Ref,
		Source:           message.Source,
		Handle:           message.MessageRef,
		ThreadRef:        message.ThreadRef,
		MessageIDHeader:  message.MessageIDHeader,
		ProviderRevision: message.ProviderRevision,
		ReceivedAt:       message.ReceivedAt.Format(time.RFC3339),
		ObservedAt:       message.ObservedAt.Format(time.RFC3339),
		Status:           message.Status,
		CaptureRef:       message.CaptureRef,
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
