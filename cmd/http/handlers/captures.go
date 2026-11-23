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

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/repository/snaptojson"
)

type captureRequest struct {
	ClientID string `json:"client_id,omitempty"`
	Kind     string `json:"kind"`
	RawText  string `json:"raw_text,omitempty"`
	BatchID  string `json:"batch_id,omitempty"`
}

type captureResponse struct {
	ID             int64  `json:"id"`
	Kind           string `json:"kind"`
	Status         string `json:"status"`
	RawText        string `json:"raw_text,omitempty"`
	DraftJSON      string `json:"draft_json,omitempty"`
	ResolutionNote string `json:"resolution_note,omitempty"`
	JobRef         string `json:"job_ref,omitempty"`
	EntryID        *int64 `json:"resolved_entry_id,omitempty"`
	ReceivedAt     string `json:"received_at"`
	ResolvedAt     string `json:"resolved_at,omitempty"`
}

type captureListResponse struct {
	Captures   []captureResponse `json:"captures"`
	NextCursor int64             `json:"next_cursor,omitempty"`
}

type capturePatchRequest struct {
	Action     string           `json:"action"`
	Reason     string           `json:"reason,omitempty"`
	OccurredOn string           `json:"occurred_on,omitempty"`
	PayeeID    *int64           `json:"payee_id,omitempty"`
	Note       string           `json:"note,omitempty"`
	Currency   string           `json:"currency,omitempty"`
	Postings   []postingRequest `json:"postings,omitempty"`
}

type captureApprovedResponse struct {
	Entry   entryResponse   `json:"entry"`
	Capture captureResponse `json:"capture"`
}

// handleListCaptures answers the review queue: extracting first, then oldest
// pending, then the resolved tail.
func (s *server) handleListCaptures(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.List")
	defer endSpan()

	cursor, err := intParam(r, "cursor")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_cursor", err.Error())

		return
	}

	limit, err := int64Param(r, "limit")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_limit", err.Error())

		return
	}

	found, err := s.deps.Captures.List(ctx, entity.CaptureFilter{
		Status: r.URL.Query().Get("status"),
		Cursor: cursor,
		Limit:  int(limit),
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

// handleCreateCapture queues one capture. It answers 202: the row exists, but
// nothing is in the ledger until it is approved.
func (s *server) handleCreateCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Create")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	input, err := readCapture(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())

		return
	}

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

// handlePatchCapture carries the deprecated verbs as body actions: approve, reject.
func (s *server) handlePatchCapture(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Captures.Patch")
	defer endSpan()

	id, err := pathID(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_id", err.Error())

		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	var request capturePatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_json", err.Error())

		return
	}

	switch request.Action {
	case "approve":
		s.approveCapture(ctx, w, id, request)
	case "reject":
		s.rejectCapture(ctx, w, id, request)
	case "retry":
		capture, err := s.deps.Captures.Retry(ctx, id)
		if err != nil {
			status, code := classify(err)
			httpx.WriteError(w, status, code, err.Error())

			return
		}

		httpx.WriteJSON(w, http.StatusOK, toCaptureResponse(capture))
	default:
		httpx.WriteError(w, http.StatusUnprocessableEntity, "unknown_action",
			"action must be approve, reject or retry")
	}
}

func (s *server) approveCapture(
	ctx context.Context,
	w http.ResponseWriter,
	id int64,
	request capturePatchRequest,
) {
	occurredOn, err := parseDate(request.OccurredOn)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	postings, err := toCapturePostingInputs(request.Postings)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	entry, capture, err := s.deps.Captures.Approve(ctx, id, captures.ApproveInput{
		OccurredOn: occurredOn,
		PayeeID:    request.PayeeID,
		Note:       request.Note,
		Currency:   request.Currency,
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

// readCapture accepts both shapes the API documents: a JSON body for text, a
// multipart body with a `file` part for images and statements.
func readCapture(r *http.Request) (captures.CreateInput, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		return readCaptureForm(r)
	}

	var request captureRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return captures.CreateInput{}, fmt.Errorf("decode capture: %w", err)
	}

	return captures.CreateInput{
		ClientID: request.ClientID,
		Kind:     request.Kind,
		RawText:  request.RawText,
		BatchID:  request.BatchID,
	}, nil
}

// readCaptureForm reads the file part once, keeps its hash and hands the bytes to
// the extractor. The document itself is not stored yet: raw/ lands with the artifact
// milestone.
func readCaptureForm(r *http.Request) (captures.CreateInput, error) {
	if err := r.ParseMultipartForm(maxFormBytes); err != nil {
		return captures.CreateInput{}, fmt.Errorf("multipart: %w", err)
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		return captures.CreateInput{}, errors.New("multipart body needs a file part")
	}

	defer func() { _ = file.Close() }()

	body, err := io.ReadAll(io.LimitReader(file, maxFormBytes))
	if err != nil {
		return captures.CreateInput{}, fmt.Errorf("read artifact: %w", err)
	}

	sum := sha256.Sum256(body)

	kind := strings.TrimSpace(r.FormValue("kind"))
	if kind == "" {
		kind = constant.CaptureKindImage
	}

	return captures.CreateInput{
		ClientID:     r.FormValue("client_id"),
		Kind:         kind,
		RawText:      r.FormValue("raw_text"),
		BatchID:      r.FormValue("batch_id"),
		ArtifactHash: hex.EncodeToString(sum[:]),
		Artifact: &snaptojson.Artifact{
			Filename:    header.Filename,
			ContentType: header.Header.Get("Content-Type"),
			Bytes:       body,
		},
	}, nil
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
		EntryID:        capture.ResolvedEntryID,
		ReceivedAt:     capture.ReceivedAt.Format(constant.TimestampLayout),
	}

	if capture.ResolvedAt != nil {
		out.ResolvedAt = capture.ResolvedAt.Format(constant.TimestampLayout)
	}

	return out
}

// toCapturePostingInputs is the capture module's posting shape.
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
