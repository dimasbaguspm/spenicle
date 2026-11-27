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
	"github.com/dimasbaguspm/spenicle/internal/common/idem"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/categorization"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
)

type importUploadRequest struct {
	IdempotencyKey string `validate:"omitempty,max=64"`
	AccountRef     string `validate:"omitempty,ref"`
	Filename       string
	FileHash       string
	Statement      []byte
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
	OccurredOn  *string `format:"date"                 json:"occurred_on,omitempty"         validate:"omitempty,datestr"`
	AmountMinor *string `json:"amount_minor,omitempty" pattern:"^[+-]?[0-9]+$"              validate:"omitempty,money"`
	Description *string `json:"description,omitempty"  validate:"omitempty,max=500"`
	CategoryRef *string `json:"category_ref,omitempty" pattern:"^[0-9a-f]{32}$"             validate:"omitempty,ref"`
	PayeeRef    *string `json:"payee_ref,omitempty"    pattern:"^[0-9a-f]{32}$"             validate:"omitempty,ref"`
	Status      *string `json:"status,omitempty"       validate:"omitempty,importrowstatus"`
}

type importRowResponse struct {
	Ref                  string `json:"ref"                              pattern:"^[0-9a-f]{32}$"`
	RowIndex             int    `json:"row_index"`
	OccurredOn           string `format:"date"                           json:"occurred_on"`
	AmountMinor          string `json:"amount_minor"                     pattern:"^[+-]?[0-9]+$"`
	Description          string `json:"description"`
	AccountRef           string `json:"account_ref"                      pattern:"^[0-9a-f]{32}$"`
	CategoryRef          string `json:"category_ref,omitempty"           pattern:"^[0-9a-f]{32}$"`
	SuggestedCategoryRef string `json:"suggested_category_ref,omitempty" pattern:"^[0-9a-f]{32}$"`
	PayeeRef             string `json:"payee_ref,omitempty"              pattern:"^[0-9a-f]{32}$"`
	Status               string `json:"status"`
	ClashKind            string `json:"clash_kind,omitempty"`
	ClashEntryRef        string `json:"clash_entry_ref,omitempty"        pattern:"^[0-9a-f]{32}$"`
}

type importBatchResponse struct {
	Ref            string              `json:"ref"             pattern:"^[0-9a-f]{32}$"`
	IdempotencyKey string              `json:"idempotency_key"`
	Filename       string              `json:"filename"`
	FileHash       string              `json:"file_hash"`
	Status         string              `json:"status"`
	Currency       string              `json:"currency"        maxLength:"3"                 minLength:"3"`
	RowsTotal      int                 `json:"rows_total"`
	Rows           []importRowResponse `json:"rows,omitempty"`
	CreatedAt      string              `format:"date-time"     json:"created_at"`
	ExpiresAt      string              `format:"date-time"     json:"expires_at"`
	CommittedAt    string              `format:"date-time"     json:"committed_at,omitempty"`
	RejectedAt     string              `format:"date-time"     json:"rejected_at,omitempty"`
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
	Ref            string `json:"ref"             pattern:"^[0-9a-f]{32}$"`
	IdempotencyKey string `json:"idempotency_key"`
	ReceivedChunks int    `json:"received_chunks"`
	ChunkTotal     int    `json:"chunk_total"`
	ReceivedBytes  string `json:"received_bytes"`
}

type importEventResponse struct {
	Ref      string          `json:"ref"                 pattern:"^[0-9a-f]{32}$"`
	Kind     string          `json:"kind"`
	RowIndex *int            `json:"row_index,omitempty"`
	Payload  json.RawMessage `json:"payload,omitempty"   swaggertype:"object"`
	Actor    string          `json:"actor"`
	At       string          `format:"date-time"         json:"at"`
}

// @Summary     Upload a CSV statement as a reviewable draft
// @Description Two-phase: this route writes a draft and nothing reaches the ledger until `PATCH /api/imports/{ref}` commits it. Send the whole file, or a chunk per call with `chunk_index` and `chunk_total`; the last chunk assembles the draft. The same `idempotency_key` with the same bytes resumes the draft (`200`), with different bytes it is `409 import_conflict`.
// @Tags        imports
// @Produce     json
// @Param       file formData file true "the CSV statement"
// @Param       idempotency_key formData string false "resume key, max 64"
// @Param       account_ref formData string false "the account every row is posted against"
// @Param       chunk_index formData int false "0-based chunk position"
// @Param       chunk_total formData int false "chunk count"
// @Success     201 {object} importBatchResponse
// @Success     200 {object} importBatchResponse
// @Success     202 {object} importChunkResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     409 {object} httpx.ErrorBody "import_conflict"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports [post]
func (s *Server) CreateImport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Imports.Create")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.ImportMaxBytes)

	request, chunk, chunked, err := readImportUpload(w, r, s.deps.ImportMaxBytes)
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
		if !s.resolveIdempotencyKey(ctx, w, &request, chunk) {
			return
		}

		s.writeChunk(ctx, w, request, chunk)

		return
	}

	if !s.resolveIdempotencyKey(ctx, w, &request, importChunkFields{Index: -1}) {
		return
	}

	batch, created, err := s.deps.Imports.Create(ctx, imports.CreateInput{
		IdempotencyKey: request.IdempotencyKey,
		AccountRef:     request.AccountRef,
		Filename:       request.Filename,
		FileHash:       request.FileHash,
		Statement:      request.Statement,
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
	s.suggestCategories(ctx, response.Rows)

	httpx.WriteJSON(w, status, response)
}

func (s *Server) writeChunk(
	ctx context.Context,
	w http.ResponseWriter,
	request importUploadRequest,
	chunk importChunkFields,
) {
	result, err := s.deps.Imports.AppendChunk(ctx, imports.ChunkInput{
		IdempotencyKey: request.IdempotencyKey,
		AccountRef:     request.AccountRef,
		Filename:       request.Filename,
		ChunkIndex:     chunk.Index,
		ChunkTotal:     chunk.Total,
		Bytes:          request.Statement,
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

		response := toImportResponse(result.Batch, true)
		s.suggestCategories(ctx, response.Rows)

		httpx.WriteJSON(w, status, response)

		return
	}

	status := http.StatusAccepted
	if result.Repeated {
		status = http.StatusOK
	}

	httpx.WriteJSON(w, status, importChunkResponse{
		Ref:            result.Upload.Ref,
		IdempotencyKey: result.Upload.IdempotencyKey,
		ReceivedChunks: result.Upload.ReceivedChunks,
		ChunkTotal:     result.Upload.ChunkTotal,
		ReceivedBytes:  strconv.FormatInt(result.Upload.ReceivedBytes, 10),
	})
}

func (s *Server) resolveIdempotencyKey(
	ctx context.Context,
	w http.ResponseWriter,
	request *importUploadRequest,
	chunk importChunkFields,
) bool {
	request.IdempotencyKey = idem.Normalize(request.IdempotencyKey)
	if request.IdempotencyKey != "" {
		return true
	}

	if chunk.Index > 0 {
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput,
			"send the idempotency_key the first chunk answered with")

		return false
	}

	minted, err := idem.Mint(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return false
	}

	request.IdempotencyKey = minted

	return true
}

func (s *Server) suggestCategories(ctx context.Context, rows []importRowResponse) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Handler.Imports.Suggest")
	defer endSpan()

	if s.deps.Categorization == nil || len(rows) == 0 {
		return
	}

	inputs := make([]categorization.SuggestInput, len(rows))
	for i := range rows {
		inputs[i] = categorization.SuggestInput{Text: rows[i].Description, Kind: constant.AccountKindExpense}
	}

	suggestions, err := s.deps.Categorization.ResolveMany(ctx, inputs)
	if err != nil {
		return
	}

	for i := range suggestions {
		rows[i].SuggestedCategoryRef = suggestions[i].AccountRef
	}
}

// @Summary     Every statement batch, newest first
// @Description A draft holds its rows for 24h past the last edit; a committed or rejected batch keeps its evidence forever.
// @Tags        imports
// @Produce     json
// @Param       status query string false "draft, committing, committed or rejected"
// @Param       cursor query string false "return batches after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{imports=[]importBatchResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports [get]
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

// @Summary     One batch with its rows
// @Description Each row carries its own clash verdict: `already_imported`, `duplicate`, `possible_duplicate` or `invalid_row`.
// @Tags        imports
// @Produce     json
// @Param       ref path string true "batch ref"
// @Success     200 {object} importBatchResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports/{ref} [get]
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

// @Summary     Edit, accept or skip one drafted row
// @Description Absolute values only, so a retry changes nothing. An edit extends the draft's `expires_at` and records the edited fields; a row edit while `committing` is `409 import_committing`.
// @Tags        imports
// @Accept      json
// @Param       body body importRowPatchRequest true "the request body"
// @Produce     json
// @Param       ref path string true "batch ref"
// @Param       index path integer true "0-based row position"
// @Success     200 {object} importBatchResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     409 {object} httpx.ErrorBody "import_closed, import_committing"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports/{ref}/rows/{index} [patch]
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

// @Summary     Commit the draft or reject it, one body action
// @Description `commit` posts the accepted rows, each under `import:<file_hash>:<row_index>`, which makes a replay a no-op. `reject` closes the draft and keeps the evidence.
// @Tags        imports
// @Accept      json
// @Param       body body importReviewRequest true "the request body"
// @Produce     json
// @Param       ref path string true "batch ref"
// @Success     200 {object} importBatchResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     409 {object} httpx.ErrorBody "import_closed, import_committing"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports/{ref} [patch]
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

// @Summary     The append-only log of one batch
// @Description `uploaded`, `resumed`, `conflict_refused`, `row_edited`, `row_accepted`, `row_skipped`, `committed`, `rejected`, `expired`; the actor says whether the user or the worker wrote it.
// @Tags        imports
// @Produce     json
// @Param       ref path string true "batch ref"
// @Param       cursor query string false "return events after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{events=[]importEventResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/imports/{ref}/events [get]
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
	limit int64,
) (importUploadRequest, importChunkFields, bool, error) {
	r.Body = http.MaxBytesReader(w, r.Body, limit)

	//nolint:gosec // G120: r.Body is capped by the MaxBytesReader above.
	if err := r.ParseMultipartForm(limit); err != nil {
		return importUploadRequest{}, importChunkFields{}, false, fmt.Errorf("multipart: %w", err)
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false,
			errors.New("multipart body needs a file part named file")
	}

	defer func() { _ = file.Close() }()

	body, err := io.ReadAll(io.LimitReader(file, limit))
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false, fmt.Errorf("read statement: %w", err)
	}

	chunk, chunked, err := readChunkFields(r)
	if err != nil {
		return importUploadRequest{}, importChunkFields{}, false, err
	}

	sum := sha256.Sum256(body)

	return importUploadRequest{
		IdempotencyKey: strings.TrimSpace(r.FormValue("idempotency_key")),
		AccountRef:     strings.TrimSpace(r.FormValue("account_ref")),
		Filename:       header.Filename,
		FileHash:       hex.EncodeToString(sum[:]),
		Statement:      body,
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
		Ref:            batch.Ref,
		IdempotencyKey: batch.IdempotencyKey,
		Filename:       batch.Filename,
		FileHash:       batch.FileHash,
		Status:         batch.Status,
		Currency:       batch.Currency,
		RowsTotal:      batch.RowsTotal,
		CreatedAt:      batch.CreatedAt.Format(constant.TimestampLayout),
		ExpiresAt:      batch.ExpiresAt.Format(constant.TimestampLayout),
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
