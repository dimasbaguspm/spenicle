package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/idem"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/exports"
)

const (
	exportJSONType      = "application/json"
	exportZIPType       = "application/zip"
	exportJSONExtension = "json"
	exportZIPExtension  = "zip"
	exportCacheControl  = "private, no-store"
)

type exportCreateRequest struct {
	IdempotencyKey string `json:"idempotency_key" validate:"omitempty,max=64"`
	Format         string `json:"format"          validate:"omitempty,oneof=json csv"`
	From           string `format:"date"          json:"from"                         validate:"omitempty,datestr"`
	To             string `format:"date"          json:"to"                           validate:"omitempty,datestr"`
}

type exportListRequest struct {
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
	Status string `query:"status" validate:"omitempty,exportstatus"`
	Format string `query:"format" validate:"omitempty,oneof=json csv"`
}

type exportResponse struct {
	Ref            string         `json:"ref"                     pattern:"^[0-9a-f]{32}$"`
	IdempotencyKey string         `json:"idempotency_key"`
	Status         string         `json:"status"`
	Format         string         `json:"format"`
	From           string         `format:"date"                  json:"from,omitempty"`
	To             string         `format:"date"                  json:"to,omitempty"`
	SchemaVersion  int            `json:"schema_version"`
	Counts         map[string]int `json:"counts,omitempty"`
	Bytes          int64          `json:"bytes"`
	CreatedAt      string         `format:"date-time"             json:"created_at"`
	StartedAt      string         `format:"date-time"             json:"started_at,omitempty"`
	FinishedAt     string         `format:"date-time"             json:"finished_at,omitempty"`
	ExpiresAt      string         `format:"date-time"             json:"expires_at,omitempty"`
	ErrorMessage   string         `json:"error_message,omitempty"`
}

type exportEventResponse struct {
	Ref     string          `json:"ref"               pattern:"^[0-9a-f]{32}$"`
	Kind    string          `json:"kind"`
	Payload json.RawMessage `json:"payload,omitempty" swaggertype:"object"`
	Actor   string          `json:"actor"`
	At      string          `format:"date-time"       json:"at"`
}

// @Summary     Queue a ledger export
// @Description A job, not a request: this answers `201` with a queued row and the worker renders it. A `idempotency_key` replay answers `200` with the same job; the same key and another `format` is `409 export_conflict`.
// @Tags        exports
// @Accept      json
// @Param       body body exportCreateRequest true "the request body"
// @Produce     json
// @Success     201 {object} exportResponse
// @Success     200 {object} exportResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     409 {object} httpx.ErrorBody "export_conflict"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/exports [post]
func (s *Server) CreateExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Create")
	defer endSpan()

	var request exportCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	fromOn, toOn, ok := exportWindow(w, request.From, request.To)
	if !ok {
		return
	}

	format := request.Format
	if format == "" {
		format = constant.ExportFormatJSON
	}

	clientID := idem.Normalize(request.IdempotencyKey)
	if clientID == "" {
		minted, mintErr := idem.Mint(ctx)
		if mintErr != nil {
			s.writeClassified(ctx, w, mintErr)

			return
		}

		clientID = minted
	}

	job, created, err := s.deps.Exports.Create(ctx, exports.CreateInput{
		IdempotencyKey: clientID,
		Format:         format,
		FromOn:         fromOn,
		ToOn:           toOn,
	})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}

	httpx.WriteJSON(w, status, toExportResponse(job))
}

// @Summary     Every export job, newest first
// @Description The way a client watches the queue; `format` and `status` narrow the listing.
// @Tags        exports
// @Produce     json
// @Param       status query string false "queued, running, ready, failed or expired"
// @Param       format query string false "json or csv"
// @Param       cursor query string false "return jobs after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{exports=[]exportResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/exports [get]
//
//nolint:dupl // the bind, filter and writeList shape is the list idiom, one per route
func (s *Server) ListExports(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.List")
	defer endSpan()

	var request exportListRequest
	if err := bindQuery(r, &request); err != nil {
		writeInvalid(w, err)

		return
	}

	filter := entity.ExportFilter{
		Status: request.Status,
		Format: request.Format,
		Cursor: request.Cursor,
		Limit:  list.ClampLimit(request.Limit),
	}

	writeList(
		ctx, w, s, "exports", filter.Limit,
		func() ([]entity.Export, error) { return s.deps.Exports.List(ctx, filter) },
		func(job entity.Export) string { return job.Ref },
		toExportResponse,
	)
}

// @Summary     One export job and its progress
// @Description A `ready` job past retention answers `410 gone` from the download route; the row stays.
// @Tags        exports
// @Produce     json
// @Param       ref path string true "export ref"
// @Success     200 {object} exportResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/exports/{ref} [get]
func (s *Server) GetExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Get")
	defer endSpan()

	ref, ok := bindExportRef(w, r)
	if !ok {
		return
	}

	job, ok := s.exportJob(ctx, w, ref)
	if !ok {
		return
	}

	httpx.WriteJSON(w, http.StatusOK, toExportResponse(job))
}

// @Summary     The append-only log of one export job
// @Description `queued`, `resumed`, `started`, `completed`, `failed`, `downloaded`, `expired`, `swept`; the actor says whether the user or the worker wrote it.
// @Tags        exports
// @Produce     json
// @Param       ref path string true "export ref"
// @Param       cursor query string false "return events after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{events=[]exportEventResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/exports/{ref}/events [get]
func (s *Server) ListExportEvents(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Events")
	defer endSpan()

	ref, ok := bindExportRef(w, r)
	if !ok {
		return
	}

	job, ok := s.exportJob(ctx, w, ref)
	if !ok {
		return
	}

	writeEventPage(ctx, w, r, s,
		func(cursor string, limit int) ([]entity.ExportEvent, error) {
			return s.deps.Exports.Events(ctx, ref,
				entity.ExportEventFilter{Cursor: cursor, Limit: limit})
		},
		func(event entity.ExportEvent) string { return event.Ref },
		toExportEventResponse,
		exportWindowFields(job),
	)
}

// @Summary     Stream the rendered document
// @Description One JSON document, or a zip of CSV sheets plus `summary.json` and `manifest.json`. The download is recorded as an event; a `ready` job past retention is `410 gone` and a blob already swept is not an error.
// @Tags        exports
// @Produce     octet-stream
// @Param       ref path string true "export ref"
// @Success     200 {file} file
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     410 {object} httpx.ErrorBody "the blob expired"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/exports/{ref}/download [get]
func (s *Server) DownloadExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Download")
	defer endSpan()

	if !requireScopes(ctx, w, constant.ScopeEntriesRead) {
		return
	}

	ref, ok := bindExportRef(w, r)
	if !ok {
		return
	}

	job, err := s.deps.Exports.Download(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	body, err := s.deps.ExportFiles.Open(ctx, job.FileHash)
	if err != nil {
		s.InternalError(ctx, w, err)

		return
	}

	defer func() { _ = body.Close() }()

	contentType, extension := exportFormat(job.Format)

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", exportCacheControl)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.%s"`,
		exportName(job), extension))
	w.WriteHeader(http.StatusOK)

	if _, copyErr := io.Copy(w, body); copyErr != nil {
		s.deps.Logger.Error(ctx, "export stream failed", slog.String("error", copyErr.Error()))
	}
}

func toExportResponse(job entity.Export) exportResponse {
	out := exportResponse{
		Ref:            job.Ref,
		IdempotencyKey: job.IdempotencyKey,
		Status:         job.Status,
		Format:         job.Format,
		From:           exportDayStamp(job.FromOn),
		To:             exportDayStamp(job.ToOn),
		SchemaVersion:  job.SchemaVersion,
		Counts:         exportCounts(job.CountsJSON),
		Bytes:          job.Bytes,
		CreatedAt:      job.CreatedAt.Format(constant.TimestampLayout),
		ErrorMessage:   job.ErrorMessage,
	}

	if job.StartedAt != nil {
		out.StartedAt = job.StartedAt.Format(constant.TimestampLayout)
	}

	if job.FinishedAt != nil {
		out.FinishedAt = job.FinishedAt.Format(constant.TimestampLayout)
	}

	if job.ExpiresAt != nil {
		out.ExpiresAt = job.ExpiresAt.Format(constant.TimestampLayout)
	}

	return out
}

func toExportEventResponse(event entity.ExportEvent) exportEventResponse {
	out := exportEventResponse{
		Ref:   event.Ref,
		Kind:  event.Kind,
		Actor: event.Actor,
		At:    event.At.Format(constant.TimestampLayout),
	}

	if event.Payload != "" {
		out.Payload = json.RawMessage(event.Payload)
	}

	return out
}

func bindExportRef(w http.ResponseWriter, r *http.Request) (string, bool) {
	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return "", false
	}

	return path.Ref, true
}

func exportCounts(raw string) map[string]int {
	if raw == "" {
		return nil
	}

	var counts map[string]int
	if err := json.Unmarshal([]byte(raw), &counts); err != nil {
		return nil
	}

	return counts
}

func exportFormat(format string) (string, string) {
	if format == constant.ExportFormatCSV {
		return exportZIPType, exportZIPExtension
	}

	return exportJSONType, exportJSONExtension
}

func exportDay(job entity.Export) string {
	at := job.CreatedAt
	if job.FinishedAt != nil {
		at = *job.FinishedAt
	}

	return at.UTC().Format(constant.DateLayout)
}

func exportName(job entity.Export) string {
	from, to := exportDayStamp(job.FromOn), exportDayStamp(job.ToOn)
	if from != "" && to != "" {
		return "spenicle-" + from + "_" + to
	}

	return "spenicle-" + exportDay(job)
}

func exportDayStamp(day *time.Time) string {
	if day == nil {
		return ""
	}

	return day.UTC().Format(constant.DateLayout)
}

func exportWindowFields(job entity.Export) map[string]any {
	from, to := exportDayStamp(job.FromOn), exportDayStamp(job.ToOn)
	if from == "" || to == "" {
		return nil
	}

	return map[string]any{"from": from, "to": to}
}

func exportWindow(
	w http.ResponseWriter,
	from, to string,
) (*time.Time, *time.Time, bool) {
	if from == "" && to == "" {
		return nil, nil, true
	}

	if from == "" || to == "" {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
			"from and to are both required for a window")

		return nil, nil, false
	}

	fromOn, err := validating.Day(from, "from")
	if err != nil {
		writeWindowInvalid(w, err)

		return nil, nil, false
	}

	toOn, err := validating.Day(to, "to")
	if err != nil {
		writeWindowInvalid(w, err)

		return nil, nil, false
	}

	return &fromOn, &toOn, true
}

func writeWindowInvalid(w http.ResponseWriter, err error) {
	httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())
}

func (s *Server) exportJob(ctx context.Context, w http.ResponseWriter, ref string) (entity.Export, bool) {
	job, found, err := s.deps.Exports.Get(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return entity.Export{}, false
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found",
			fmt.Sprintf("%v: export %s", entity.ErrNotFound, ref))

		return entity.Export{}, false
	}

	return job, true
}
