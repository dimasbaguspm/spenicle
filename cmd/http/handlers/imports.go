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
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
)

type importUploadRequest struct {
	ClientID   string `validate:"required,max=64"`
	AccountRef string `validate:"omitempty,ref"`
	Filename   string
	FileHash   string
	Statement  []byte
}

type importListRequest struct {
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
	Status string `query:"status" validate:"omitempty,importstatus"`
}

type importRowPathRequest struct {
	Ref   string `path:"ref"   validate:"required,ref"`
	Index int64  `path:"index" validate:"gte=0"`
}

type importRowPatchRequest struct {
	OccurredOn  *string `json:"occurred_on,omitempty"  validate:"omitempty,datestr"`
	AmountMinor *string `json:"amount_minor,omitempty" validate:"omitempty,money"`
	Description *string `json:"description,omitempty"  validate:"omitempty,max=500"`
	CategoryRef *string `json:"category_ref,omitempty" validate:"omitempty,ref"`
	PayeeRef    *string `json:"payee_ref,omitempty"    validate:"omitempty,ref"`
	Status      *string `json:"status,omitempty"       validate:"omitempty,importrowstatus"`
}

type importRowResponse struct {
	Ref                  string `json:"ref"`
	RowIndex             int    `json:"row_index"`
	OccurredOn           string `json:"occurred_on"`
	AmountMinor          string `json:"amount_minor"`
	Description          string `json:"description"`
	AccountRef           string `json:"account_ref"`
	CategoryRef          string `json:"category_ref,omitempty"`
	SuggestedCategoryRef string `json:"suggested_category_ref,omitempty"`
	PayeeRef             string `json:"payee_ref,omitempty"`
	Status               string `json:"status"`
	ClashKind            string `json:"clash_kind,omitempty"`
	ClashEntryRef        string `json:"clash_entry_ref,omitempty"`
}

type importBatchResponse struct {
	Ref         string              `json:"ref"`
	ClientID    string              `json:"client_id"`
	Filename    string              `json:"filename"`
	FileHash    string              `json:"file_hash"`
	Status      string              `json:"status"`
	Currency    string              `json:"currency"`
	RowsTotal   int                 `json:"rows_total"`
	Rows        []importRowResponse `json:"rows,omitempty"`
	CreatedAt   string              `json:"created_at"`
	ExpiresAt   string              `json:"expires_at"`
	CommittedAt string              `json:"committed_at,omitempty"`
	RejectedAt  string              `json:"rejected_at,omitempty"`
}

type importReviewRequest struct {
	Action string `json:"action" validate:"required,oneof=commit reject"`
	Reason string `json:"reason" validate:"max=1000"`
}

type importChunkFields struct {
	Index int
	Total int
}

type importChunkResponse struct {
	Ref            string `json:"ref"`
	ReceivedChunks int    `json:"received_chunks"`
	ChunkTotal     int    `json:"chunk_total"`
	ReceivedBytes  string `json:"received_bytes"`
}

type importEventResponse struct {
	Ref      string          `json:"ref"`
	Kind     string          `json:"kind"`
	RowIndex *int            `json:"row_index,omitempty"`
	Payload  json.RawMessage `json:"payload,omitempty"`
	Actor    string          `json:"actor"`
	At       string          `json:"at"`
}

func (s *Server) CreateImport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.Create")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.ImportMaxBytes)

	request, chunk, chunked, err := readImportUpload(w, r)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	if err = validating.Struct(request); err != nil {
		writeInvalid(w, err)

		return
	}

	if limit := s.deps.ImportMaxBytes; limit > 0 && int64(len(request.Statement)) > limit {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
			fmt.Sprintf("statement is larger than %d bytes", limit))

		return
	}

	if chunked {
		s.writeChunk(ctx, w, request, chunk)

		return
	}

	batch, created, err := s.deps.Imports.Create(ctx, imports.CreateInput{
		ClientID:   request.ClientID,
		AccountRef: request.AccountRef,
		Filename:   request.Filename,
		FileHash:   request.FileHash,
		Statement:  request.Statement,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}

	response := toImportResponse(batch, true)
	if s.deps.Categorization != nil {
		for i := range response.Rows {
			suggestion, err := s.deps.Categorization.Resolve(ctx, categorization.SuggestInput{
				Text: response.Rows[i].Description,
				Kind: constant.AccountKindExpense,
			})
			if err == nil {
				response.Rows[i].SuggestedCategoryRef = suggestion.AccountRef
			}
		}
	}
	httpx.WriteJSON(w, status, response)
}

func (s *Server) writeChunk(
	ctx context.Context,
	w http.ResponseWriter,
	request importUploadRequest,
	chunk importChunkFields,
) {
	result, err := s.deps.Imports.AppendChunk(ctx, imports.ChunkInput{
		ClientID:   request.ClientID,
		AccountRef: request.AccountRef,
		Filename:   request.Filename,
		ChunkIndex: chunk.Index,
		ChunkTotal: chunk.Total,
		Bytes:      request.Statement,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if result.Complete() {
		status := http.StatusOK
		if result.Created {
			status = http.StatusCreated
		}

		httpx.WriteJSON(w, status, toImportResponse(result.Batch, true))

		return
	}

	status := http.StatusAccepted
	if result.Repeated {
		status = http.StatusOK
	}

	httpx.WriteJSON(w, status, importChunkResponse{
		Ref:            result.Upload.Ref,
		ReceivedChunks: result.Upload.ReceivedChunks,
		ChunkTotal:     result.Upload.ChunkTotal,
		ReceivedBytes:  strconv.FormatInt(result.Upload.ReceivedBytes, 10),
	})
}

func (s *Server) ListImports(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.List")
	defer endSpan()

	var request importListRequest
	if err := bindQuery(r, &request); err != nil {
		writeInvalid(w, err)

		return
	}

	filter := entity.ImportFilter{
		Status: request.Status,
		Cursor: request.Cursor,
		Limit:  list.ClampLimit(request.Limit),
	}

	writeList(
		ctx, w, s, "imports", filter.Limit,
		func() ([]entity.ImportBatch, error) { return s.deps.Imports.List(ctx, filter) },
		func(batch entity.ImportBatch) string { return batch.Ref },
		func(batch entity.ImportBatch) importBatchResponse { return toImportResponse(batch, false) },
	)
}

func (s *Server) GetImport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.Get")
	defer endSpan()

	ref, ok := bindImportRef(w, r)
	if !ok {
		return
	}

	batch, err := s.deps.Imports.Get(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toImportResponse(batch, true))
}

func (s *Server) PatchImportRow(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.PatchRow")
	defer endSpan()

	var path importRowPathRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request importRowPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	update, err := toRowUpdate(request)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	if update.CategoryRef != nil && *update.CategoryRef != "" &&
		!s.categoryAccount(ctx, w, *update.CategoryRef) {
		return
	}

	batch, err := s.deps.Imports.PatchRow(ctx, path.Ref, path.Index, update)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toImportResponse(batch, true))
}

func (s *Server) PatchImport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.Patch")
	defer endSpan()

	ref, ok := bindImportRef(w, r)
	if !ok {
		return
	}

	var request importReviewRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}
	if request.Action == "commit" && !requireScopes(ctx, w, constant.ScopeEntriesWrite) {
		return
	}

	batch, err := s.deps.Imports.Review(ctx, ref, imports.Review{
		Action: request.Action,
		Reason: strings.TrimSpace(request.Reason),
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toImportResponse(batch, true))
}

func (s *Server) ListImportEvents(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.Events")
	defer endSpan()

	ref, ok := bindImportRef(w, r)
	if !ok {
		return
	}

	writeEventPage(ctx, w, r, s,
		func(cursor string, limit int) ([]entity.ImportEvent, error) {
			return s.deps.Imports.ListEvents(ctx, ref,
				entity.ImportEventFilter{Cursor: cursor, Limit: limit})
		},
		func(event entity.ImportEvent) string { return event.Ref },
		toImportEventResponse,
	)
}

func toImportEventResponse(event entity.ImportEvent) importEventResponse {
	out := importEventResponse{
		Ref:      event.Ref,
		Kind:     event.Kind,
		RowIndex: event.RowIndex,
		Actor:    event.Actor,
		At:       event.At.Format(constant.TimestampLayout),
	}

	if event.Payload != "" {
		out.Payload = json.RawMessage(event.Payload)
	}

	return out
}

func bindImportRef(w http.ResponseWriter, r *http.Request) (string, bool) {
	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return "", false
	}

	return path.Ref, true
}

func toRowUpdate(request importRowPatchRequest) (imports.RowUpdate, error) {
	update := imports.RowUpdate{
		Description: request.Description,
		CategoryRef: request.CategoryRef,
		PayeeRef:    request.PayeeRef,
		Status:      request.Status,
	}

	if request.OccurredOn != nil {
		occurredOn, err := validating.Day(*request.OccurredOn, "occurred_on")
		if err != nil {
			return imports.RowUpdate{}, err
		}

		update.OccurredOn = &occurredOn
	}

	if request.AmountMinor != nil {
		amount, err := validating.Money(*request.AmountMinor, "amount_minor")
		if err != nil {
			return imports.RowUpdate{}, err
		}

		update.AmountMinor = &amount
	}

	if update.DescribesNothing() {
		return imports.RowUpdate{}, errors.New(
			"send at least one of occurred_on, amount_minor, description, category_ref, payee_ref, status",
		)
	}

	return update, nil
}

func readImportUpload(
	w http.ResponseWriter,
	r *http.Request,
) (importUploadRequest, importChunkFields, bool, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxFormBytes)

	//nolint:gosec // G120: r.Body is capped by the MaxBytesReader above.
	if err := r.ParseMultipartForm(maxFormBytes); err != nil {
		return importUploadRequest{}, importChunkFields{}, false, fmt.Errorf("multipart: %w", err)
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false,
			errors.New("multipart body needs a file part named file")
	}

	defer func() { _ = file.Close() }()

	body, err := io.ReadAll(io.LimitReader(file, maxFormBytes))
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false, fmt.Errorf("read statement: %w", err)
	}

	chunk, chunked, err := readChunkFields(r)
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false, err
	}

	sum := sha256.Sum256(body)

	return importUploadRequest{
		ClientID:   strings.TrimSpace(r.FormValue("client_id")),
		AccountRef: strings.TrimSpace(r.FormValue("account_ref")),
		Filename:   header.Filename,
		FileHash:   hex.EncodeToString(sum[:]),
		Statement:  body,
	}, chunk, chunked, nil
}

func readChunkFields(r *http.Request) (importChunkFields, bool, error) {
	index := strings.TrimSpace(r.FormValue("chunk_index"))
	total := strings.TrimSpace(r.FormValue("chunk_total"))

	if index == "" && total == "" {
		return importChunkFields{}, false, nil
	}

	if index == "" || total == "" {
		return importChunkFields{}, false, errors.New("chunk_index and chunk_total go together")
	}

	parsedIndex, err := strconv.Atoi(index)
	if err != nil || parsedIndex < 0 {
		return importChunkFields{}, false,
			fmt.Errorf("chunk_index %q is not a zero-based index", index)
	}

	parsedTotal, err := strconv.Atoi(total)
	if err != nil || parsedTotal < 1 {
		return importChunkFields{}, false,
			fmt.Errorf("chunk_total %q is not a positive count", total)
	}

	return importChunkFields{Index: parsedIndex, Total: parsedTotal}, true, nil
}

func toImportResponse(batch entity.ImportBatch, withRows bool) importBatchResponse {
	out := importBatchResponse{
		Ref:       batch.Ref,
		ClientID:  batch.ClientID,
		Filename:  batch.Filename,
		FileHash:  batch.FileHash,
		Status:    batch.Status,
		Currency:  batch.Currency,
		RowsTotal: batch.RowsTotal,
		CreatedAt: batch.CreatedAt.Format(constant.TimestampLayout),
		ExpiresAt: batch.ExpiresAt.Format(constant.TimestampLayout),
	}

	if batch.CommittedAt != nil {
		out.CommittedAt = batch.CommittedAt.Format(constant.TimestampLayout)
	}

	if batch.RejectedAt != nil {
		out.RejectedAt = batch.RejectedAt.Format(constant.TimestampLayout)
	}

	if withRows {
		out.Rows = make([]importRowResponse, 0, len(batch.Rows))

		for _, row := range batch.Rows {
			out.Rows = append(out.Rows, importRowResponse{
				Ref:           row.Ref,
				RowIndex:      row.RowIndex,
				OccurredOn:    row.OccurredOn.Format(constant.DateLayout),
				AmountMinor:   strconv.FormatInt(row.AmountMinor, 10),
				Description:   row.Description,
				AccountRef:    row.AccountRef,
				CategoryRef:   row.CategoryRef,
				PayeeRef:      row.PayeeRef,
				Status:        row.Status,
				ClashKind:     row.ClashKind,
				ClashEntryRef: row.ClashEntryRef,
			})
		}
	}

	return out
}
