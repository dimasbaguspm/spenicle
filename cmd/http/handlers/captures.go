package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

type captureRequest struct {
	IdempotencyKey string               `json:"idempotency_key,omitempty" validate:"omitempty,max=64"`
	Kind           string               `json:"kind"                      validate:"capturekind"`
	RawText        string               `json:"raw_text,omitempty"        validate:"max=8000"`
	GroupLabel     string               `json:"group_label,omitempty"     validate:"max=64"`
	ArtifactHash   string               `json:"-"`
	Artifact       *extraction.Artifact `json:"-"`
}

type captureApprove struct {
	OccurredOn string           `validate:"required,datestr"`
	Currency   string           `validate:"required,currency"`
	Postings   []postingRequest `validate:"required,min=2,dive"`
}

type captureResponse struct {
	Ref                  string `json:"ref"                              pattern:"^[0-9a-f]{32}$"`
	Kind                 string `json:"kind"`
	Status               string `json:"status"`
	RawText              string `json:"raw_text,omitempty"`
	DraftJSON            string `json:"draft_json,omitempty"`
	ResolutionNote       string `json:"resolution_note,omitempty"`
	JobRef               string `json:"job_ref,omitempty"                pattern:"^[0-9a-f]{32}$"`
	ExtractionRail       string `json:"extraction_rail,omitempty"`
	ExtractionModel      string `json:"extraction_model,omitempty"`
	EntryRef             string `json:"resolved_entry_ref,omitempty"     pattern:"^[0-9a-f]{32}$"`
	SuggestedCategoryRef string `json:"suggested_category_ref,omitempty" pattern:"^[0-9a-f]{32}$"`
	ReceivedAt           string `format:"date-time"                      json:"received_at"`
	ResolvedAt           string `format:"date-time"                      json:"resolved_at,omitempty"`
}

type capturePatchRequest struct {
	Action     string           `json:"action"              validate:"required,captureaction"`
	Reason     string           `json:"reason,omitempty"    validate:"max=2000"`
	OccurredOn string           `format:"date"              json:"occurred_on,omitempty"      validate:"omitempty,datestr"`
	PayeeRef   string           `json:"payee_ref,omitempty" pattern:"^[0-9a-f]{32}$"          validate:"omitempty,ref"`
	Note       string           `json:"note,omitempty"      validate:"max=2000"`
	EntryRef   string           `json:"entry_ref,omitempty" pattern:"^[0-9a-f]{32}$"          validate:"omitempty,ref"`
	Currency   string           `json:"currency,omitempty"  maxLength:"3"                     minLength:"3"                validate:"omitempty,currency"`
	Postings   []postingRequest `json:"postings,omitempty"  validate:"omitempty,min=2,dive"`
	Learn      *bool            `json:"learn,omitempty"     validate:"omitempty"`
}

type captureApprovedResponse struct {
	Entry   entryResponse   `json:"entry"`
	Capture captureResponse `json:"capture"`
}

// @Summary     The review queue
// @Description Pending first. A capture is unconfirmed by definition: only an approval writes an entry.
// @Tags        captures
// @Produce     json
// @Param       status query string false "pending, approved or rejected"
// @Param       refs query string false "capture refs, comma-separated"
// @Param       cursor query string false "return captures after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{captures=[]captureResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/captures [get]
func (s *Server) ListCaptures(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, s.location, captureFilter)
	if !ok {
		return
	}

	writeList(
		ctx, w, s, "captures", filter.Limit,
		func() ([]entity.Capture, error) { return s.deps.Captures.List(ctx, filter) },
		func(capture entity.Capture) string { return capture.Ref },
		toCaptureResponse,
	)
}

// @Summary     Park something unconfirmed
// @Description Writes no ledger entry: a capture is the two-second capture path. `202` when it is parked for extraction, `200` when `idempotency_key` replayed a stored capture.
// @Tags        captures
// @Accept      json
// @Produce     json
// @Param       body body captureRequest true "the capture to park"
// @Success     202 {object} captureResponse
// @Success     200 {object} captureResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/captures [post]
func (s *Server) CreateCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Create")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	request, err := readCapture(w, r, s.deps.MaxArtifactBytes)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	if err = validating.Struct(request); err != nil {
		writeInvalid(w, err)

		return
	}

	if !s.artifactFits(w, request) {
		return
	}

	input := request.input()

	capture, created, err := s.deps.Captures.Create(ctx, input)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	status := http.StatusAccepted
	if !created {
		status = http.StatusOK
	}

	response := toCaptureResponse(capture)
	if s.deps.Categorization != nil {
		suggestion, err := s.deps.Categorization.Resolve(ctx, categorization.SuggestInput{
			Text: capture.RawText,
			Kind: constant.AccountKindExpense,
		})
		if err == nil {
			response.SuggestedCategoryRef = suggestion.AccountRef
		}
	}

	httpx.WriteJSON(w, status, response)
}

// @Summary     Approve, reject, retry or match a capture
// @Description `action` picks the branch: `approve` posts a balanced entry and answers `201` with the entry beside the capture, `reject` closes it, `retry` re-runs extraction, `match` links it to an entry that already exists.
// @Tags        captures
// @Accept      json
// @Param       body body capturePatchRequest true "the request body"
// @Produce     json
// @Param       ref path string true "capture ref"
// @Success     200 {object} captureResponse
// @Success     201 {object} captureApprovedResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/captures/{ref} [patch]
func (s *Server) PatchCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request capturePatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	switch request.Action {
	case "approve":
		s.patchApprove(ctx, w, path.Ref, request)
	case "reject":
		s.rejectCapture(ctx, w, path.Ref, request)
	case "retry":
		s.retryCapture(ctx, w, path.Ref)
	case "match":
		s.patchMatch(ctx, w, path.Ref, request)
	}
}

func (s *Server) patchApprove(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request capturePatchRequest,
) {
	if !requireScopes(ctx, w, constant.ScopeEntriesWrite) {
		return
	}

	if request.PayeeRef != "" && (request.Learn == nil || *request.Learn) &&
		!requireScopes(ctx, w, constant.ScopePayeesWrite) {
		return
	}

	s.approveCapture(ctx, w, ref, request)
}

func (s *Server) retryCapture(ctx context.Context, w http.ResponseWriter, ref string) {
	capture, err := s.deps.Captures.Retry(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
}

func (s *Server) patchMatch(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request capturePatchRequest,
) {
	if !requireScopes(ctx, w, constant.ScopeEntriesRead) {
		return
	}

	s.matchCapture(ctx, w, ref, request)
}

func (s *Server) matchCapture(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request capturePatchRequest,
) {
	if request.EntryRef == "" {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", "match needs an entry_ref")

		return
	}

	_, capture, err := s.deps.Captures.Approve(ctx, ref, captures.ApproveInput{EntryRef: request.EntryRef})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
}

func (s *Server) approveCapture(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request capturePatchRequest,
) {
	approval := captureApprove{
		OccurredOn: request.OccurredOn,
		Currency:   request.Currency,
		Postings:   request.Postings,
	}

	if err := validating.Struct(approval); err != nil {
		writeInvalid(w, err)

		return
	}

	occurredOn, err := validating.Day(approval.OccurredOn, "occurred_on")
	if err != nil {
		writeInvalid(w, err)

		return
	}

	postings, err := toCapturePostingInputs(approval.Postings)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	entry, capture, err := s.deps.Captures.Approve(ctx, ref, captures.ApproveInput{
		OccurredOn: occurredOn,
		Note:       request.Note,
		Currency:   approval.Currency,
		PayeeRef:   request.PayeeRef,
		Postings:   postings,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	s.rememberCategory(ctx, request, postings)

	entryBody, err := s.entryResponse(ctx, entry)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, captureApprovedResponse{
		Entry:   entryBody,
		Capture: toCaptureResponse(capture),
	})
}

func (s *Server) rejectCapture(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request capturePatchRequest,
) {
	capture, err := s.deps.Captures.Reject(ctx, ref, request.Reason)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
}

// @Summary     Download the document behind a capture
// @Description The bytes are gzipped when compressible and encrypted under `APP_SECRET`; the row is metadata, the file is the document. `410` once the retention sweep reclaimed it.
// @Tags        captures
// @Produce     octet-stream
// @Param       ref path string true "capture ref"
// @Success     200 {file} file
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     410 {object} httpx.ErrorBody "the artifact was reclaimed"
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/captures/{ref}/artifact [get]
func (s *Server) GetCaptureArtifact(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Artifact")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	artifact, found, err := s.deps.Artifacts.ArtifactByCaptureRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "capture "+path.Ref+" has no artifact")

		return
	}

	if artifact.DeletedAt != nil {
		httpx.WriteError(w, http.StatusGone, "gone", "artifact "+artifact.Ref+" was reclaimed")

		return
	}

	body, err := s.deps.ArtifactFiles.Open(ctx, artifact.SHA256)
	if err != nil {
		if errors.Is(err, filestore.ErrNotFound) {
			httpx.WriteError(w, http.StatusNotFound, "not_found", "artifact file is not there")

			return
		}

		s.InternalError(ctx, w, err)

		return
	}

	defer func() { _ = body.Close() }()

	w.Header().Set("Content-Type", contentOf(artifact.ContentType))
	w.Header().Set("Content-Disposition", `attachment; filename="`+attachmentFilename(artifact.Filename)+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")

	w.WriteHeader(http.StatusOK)

	if _, err := io.Copy(w, body); err != nil {
		s.deps.Logger.Error(ctx, "stream artifact", slog.String("error", err.Error()))
	}
}

func (s *Server) artifactFits(w http.ResponseWriter, request captureRequest) bool {
	limit := s.deps.MaxArtifactBytes
	if limit <= 0 || request.Artifact == nil || int64(len(request.Artifact.Bytes)) <= limit {
		return true
	}

	httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
		fmt.Sprintf("artifact is larger than %d bytes", limit))

	return false
}

func contentOf(contentType string) string {
	if strings.TrimSpace(contentType) == "" {
		return "application/octet-stream"
	}

	return contentType
}

func attachmentFilename(name string) string {
	cleaned := strings.Map(func(char rune) rune {
		if char == '"' || char == '\\' || char < ' ' || char == 0x7f {
			return -1
		}

		return char
	}, name)

	if cleaned == "" {
		return "artifact"
	}

	return cleaned
}

func readCapture(w http.ResponseWriter, r *http.Request, limit int64) (captureRequest, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		return readCaptureForm(w, r, limit)
	}

	var request captureRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return captureRequest{}, fmt.Errorf("decode capture: %w", err)
	}

	return request, nil
}

func (c captureRequest) input() captures.CreateInput {
	return captures.CreateInput{
		IdempotencyKey: c.IdempotencyKey,
		Kind:           c.Kind,
		RawText:        c.RawText,
		GroupLabel:     c.GroupLabel,
		ArtifactHash:   c.ArtifactHash,
		Artifact:       c.Artifact,
	}
}

func readCaptureForm(w http.ResponseWriter, r *http.Request, limit int64) (captureRequest, error) {
	r.Body = http.MaxBytesReader(w, r.Body, limit)

	//nolint:gosec // G120: r.Body is capped by the MaxBytesReader above.
	if err := r.ParseMultipartForm(limit); err != nil {
		return captureRequest{}, fmt.Errorf("multipart: %w", err)
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		return captureRequest{}, errors.New("invalid_request: multipart body needs a file part")
	}

	defer func() { _ = file.Close() }()

	body, err := io.ReadAll(io.LimitReader(file, limit))
	if err != nil {
		return captureRequest{}, fmt.Errorf("read artifact: %w", err)
	}

	sum := sha256.Sum256(body)

	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = constant.CaptureKindImage
	}

	request := captureRequest{
		IdempotencyKey: r.FormValue("idempotency_key"),
		Kind:           kind,
		RawText:        r.FormValue("raw_text"),
		GroupLabel:     r.FormValue("group_label"),
	}

	request.ArtifactHash = hex.EncodeToString(sum[:])
	request.Artifact = &extraction.Artifact{
		Filename:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		Bytes:       body,
	}

	return request, nil
}

func toCaptureResponse(capture entity.Capture) captureResponse {
	out := captureResponse{
		Ref:             capture.Ref,
		Kind:            capture.Kind,
		Status:          capture.Status,
		RawText:         capture.RawText,
		DraftJSON:       capture.DraftJSON,
		ResolutionNote:  capture.ResolutionNote,
		JobRef:          capture.JobRef,
		ExtractionRail:  capture.ExtractionRail,
		ExtractionModel: capture.ExtractionModel,
		EntryRef:        capture.ResolvedEntryRef,
		ReceivedAt:      capture.ReceivedAt.Format(constant.TimestampLayout),
	}

	if capture.ResolvedAt != nil {
		out.ResolvedAt = capture.ResolvedAt.Format(constant.TimestampLayout)
	}

	return out
}

func toCapturePostingInputs(request []postingRequest) ([]captures.PostingInput, error) {
	postings := make([]captures.PostingInput, 0, len(request))

	for _, posting := range request {
		amount, err := validating.Money(posting.AmountMinor, "amount_minor")
		if err != nil {
			return nil, errors.New("amount_minor must be an integer string")
		}

		postings = append(postings, captures.PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: amount,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return postings, nil
}

func (s *Server) rememberCategory(
	ctx context.Context,
	request capturePatchRequest,
	postings []captures.PostingInput,
) {
	if request.PayeeRef == "" || (request.Learn != nil && !*request.Learn) {
		return
	}

	payee, found, err := s.deps.Payees.PayeeByRef(ctx, request.PayeeRef)
	if err != nil || !found || payee.DefaultCategoryRef != "" {
		return
	}

	for _, posting := range postings {
		account, ok, accountErr := s.deps.Accounts.AccountByRef(ctx, posting.AccountRef)
		if accountErr != nil {
			return
		}

		if !ok || !isCategoryKind(account.Kind) {
			continue
		}

		payee.DefaultCategoryRef = account.Ref

		if _, updateErr := s.deps.Payees.UpdatePayee(ctx, payee); updateErr != nil {
			s.deps.Logger.Warn(ctx, "remember the approved category",
				slog.String("payee", payee.Ref), slog.String("error", updateErr.Error()))
		}

		return
	}
}

func isCategoryKind(kind string) bool {
	return kind == constant.AccountKindExpense || kind == constant.AccountKindIncome
}
