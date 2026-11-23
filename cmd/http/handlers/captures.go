package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

type captureRequest struct {
	ClientID     string               `json:"client_id,omitempty" validate:"omitempty,max=64"`
	Kind         string               `json:"kind"                validate:"capturekind"`
	RawText      string               `json:"raw_text,omitempty"  validate:"max=8000"`
	BatchID      string               `json:"batch_id,omitempty"  validate:"max=64"`
	ArtifactHash string               `json:"-"`
	Artifact     *extraction.Artifact `json:"-"`
}

type captureListQuery struct {
	Status string `query:"status" validate:"omitempty,capturestatus"`
	Cursor int64  `query:"cursor" validate:"omitempty,gte=0"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
}

type captureApprove struct {
	OccurredOn string           `validate:"required,datestr"`
	Currency   string           `validate:"required,currency"`
	Postings   []postingRequest `validate:"required,min=2,dive"`
}

type captureResponse struct {
	ID             int64  `json:"id"`
	Kind           string `json:"kind"`
	Status         string `json:"status"`
	RawText        string `json:"raw_text,omitempty"`
	DraftJSON      string `json:"draft_json,omitempty"`
	ResolutionNote string `json:"resolution_note,omitempty"`
	JobRef         string `json:"job_ref,omitempty"`
	ExtractionRail string `json:"extraction_rail,omitempty"`
	EntryID        *int64 `json:"resolved_entry_id,omitempty"`
	ReceivedAt     string `json:"received_at"`
	ResolvedAt     string `json:"resolved_at,omitempty"`
}

type captureListResponse struct {
	Captures   []captureResponse `json:"captures"`
	NextCursor int64             `json:"next_cursor,omitempty"`
}

type capturePatchRequest struct {
	Action     string           `json:"action"                validate:"required,oneof=approve reject retry"`
	Reason     string           `json:"reason,omitempty"      validate:"max=2000"`
	OccurredOn string           `json:"occurred_on,omitempty" validate:"omitempty,datestr"`
	PayeeID    *int64           `json:"payee_id,omitempty"    validate:"omitempty,gt=0"`
	Note       string           `json:"note,omitempty"        validate:"max=2000"`
	Currency   string           `json:"currency,omitempty"    validate:"omitempty,currency"`
	Postings   []postingRequest `json:"postings,omitempty"    validate:"omitempty,min=2,dive"`
}

type captureApprovedResponse struct {
	Entry   entryResponse   `json:"entry"`
	Capture captureResponse `json:"capture"`
}

func (s *server) handleListCaptures(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.List")
	defer endSpan()

	var query captureListQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	found, err := s.deps.Captures.List(ctx, entity.CaptureFilter{
		Status: query.Status,
		Cursor: query.Cursor,
		Limit:  int(query.Limit),
	})
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out := captureListResponse{Captures: make([]captureResponse, 0, len(found))}
	for _, capture := range found {
		out.Captures = append(out.Captures, toCaptureResponse(capture))
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func (s *server) handleCreateCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Create")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	request, err := readCapture(r)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	if err = validate.Struct(request); err != nil {
		writeInvalid(w, err)

		return
	}

	input := request.input()

	capture, created, err := s.deps.Captures.Create(ctx, input)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	status := http.StatusAccepted
	if !created {
		status = http.StatusOK
	}

	httpx.WriteJSON(w, status, toCaptureResponse(capture))
}

func (s *server) handlePatchCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Patch")
	defer endSpan()

	var path pathIDRequest
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
		s.approveCapture(ctx, w, path.ID, request)
	case "reject":
		s.rejectCapture(ctx, w, path.ID, request)
	case "retry":
		capture, err := s.deps.Captures.Retry(ctx, path.ID)
		if err != nil {
			status, code := classify(err)
			httpx.WriteError(w, status, code, err.Error())

			return
		}

		httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
	}
}

func (s *server) approveCapture(
	ctx context.Context,
	w http.ResponseWriter,
	id int64,
	request capturePatchRequest,
) {
	approval := captureApprove{
		OccurredOn: request.OccurredOn,
		Currency:   request.Currency,
		Postings:   request.Postings,
	}

	if err := validate.Struct(approval); err != nil {
		writeInvalid(w, err)

		return
	}

	occurredOn, err := time.Parse(constant.DateLayout, approval.OccurredOn)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	postings, err := toCapturePostingInputs(approval.Postings)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	entry, capture, err := s.deps.Captures.Approve(ctx, id, captures.ApproveInput{
		OccurredOn: occurredOn,
		PayeeID:    request.PayeeID,
		Note:       request.Note,
		Currency:   approval.Currency,
		Postings:   postings,
	})
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, captureApprovedResponse{
		Entry:   toEntryResponse(entry),
		Capture: toCaptureResponse(capture),
	})
}

func (s *server) rejectCapture(
	ctx context.Context,
	w http.ResponseWriter,
	id int64,
	request capturePatchRequest,
) {
	capture, err := s.deps.Captures.Reject(ctx, id, request.Reason)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
}

func readCapture(r *http.Request) (captureRequest, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		return readCaptureForm(r)
	}

	var request captureRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return captureRequest{}, fmt.Errorf("decode capture: %w", err)
	}

	return request, nil
}

func (c captureRequest) input() captures.CreateInput {
	return captures.CreateInput{
		ClientID:     c.ClientID,
		Kind:         c.Kind,
		RawText:      c.RawText,
		BatchID:      c.BatchID,
		ArtifactHash: c.ArtifactHash,
		Artifact:     c.Artifact,
	}
}

func readCaptureForm(r *http.Request) (captureRequest, error) {
	if err := r.ParseMultipartForm(maxFormBytes); err != nil {
		return captureRequest{}, fmt.Errorf("multipart: %w", err)
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		return captureRequest{}, errors.New("invalid_request: multipart body needs a file part")
	}

	defer func() { _ = file.Close() }()

	body, err := io.ReadAll(io.LimitReader(file, maxFormBytes))
	if err != nil {
		return captureRequest{}, fmt.Errorf("read artifact: %w", err)
	}

	sum := sha256.Sum256(body)

	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = constant.CaptureKindImage
	}

	request := captureRequest{
		ClientID: r.FormValue("client_id"),
		Kind:     kind,
		RawText:  r.FormValue("raw_text"),
		BatchID:  r.FormValue("batch_id"),
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
		ID:             capture.ID,
		Kind:           capture.Kind,
		Status:         capture.Status,
		RawText:        capture.RawText,
		DraftJSON:      capture.DraftJSON,
		ResolutionNote: capture.ResolutionNote,
		JobRef:         capture.JobRef,
		ExtractionRail: capture.ExtractionRail,
		EntryID:        capture.ResolvedEntryID,
		ReceivedAt:     capture.ReceivedAt.Format(constant.TimestampLayout),
	}

	if capture.ResolvedAt != nil {
		out.ResolvedAt = capture.ResolvedAt.Format(constant.TimestampLayout)
	}

	return out
}

func toCapturePostingInputs(request []postingRequest) ([]captures.PostingInput, error) {
	postings := make([]captures.PostingInput, 0, len(request))

	for _, posting := range request {
		amount, err := strconv.ParseInt(strings.TrimSpace(posting.AmountMinor), 10, 64)
		if err != nil {
			return nil, errors.New("amount_minor must be an integer string")
		}

		postings = append(postings, captures.PostingInput{
			AccountID:   posting.AccountID,
			AmountMinor: amount,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return postings, nil
}
