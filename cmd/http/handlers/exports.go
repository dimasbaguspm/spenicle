package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
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
	ClientID string `json:"client_id" validate:"required,max=64"`
	Format   string `json:"format"    validate:"omitempty,oneof=json csv"`
}

type exportListRequest struct {
	Cursor string `query:"cursor" validate:"omitempty,ref"`
	Limit  int64  `query:"limit"  validate:"omitempty,gte=0,lte=200"`
	Status string `query:"status" validate:"omitempty,exportstatus"`
	Format string `query:"format" validate:"omitempty,oneof=json csv"`
}

type exportResponse struct {
	Ref           string         `json:"ref"`
	ClientID      string         `json:"client_id"`
	Status        string         `json:"status"`
	Format        string         `json:"format"`
	SchemaVersion int            `json:"schema_version"`
	Counts        map[string]int `json:"counts,omitempty"`
	Bytes         int64          `json:"bytes"`
	CreatedAt     string         `json:"created_at"`
	StartedAt     string         `json:"started_at,omitempty"`
	FinishedAt    string         `json:"finished_at,omitempty"`
	ExpiresAt     string         `json:"expires_at,omitempty"`
	ErrorMessage  string         `json:"error_message,omitempty"`
}

type exportEventResponse struct {
	Ref     string          `json:"ref"`
	Kind    string          `json:"kind"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Actor   string          `json:"actor"`
	At      string          `json:"at"`
}

func (s *Server) CreateExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Create")
	defer endSpan()

	var request exportCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	format := request.Format
	if format == "" {
		format = constant.ExportFormatJSON
	}

	job, created, err := s.deps.Exports.Create(ctx, exports.CreateInput{
		ClientID: strings.TrimSpace(request.ClientID),
		Format:   format,
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

func (s *Server) GetExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Get")
	defer endSpan()

	ref, ok := bindExportRef(w, r)
	if !ok {
		return
	}

	job, found, err := s.deps.Exports.Get(ctx, ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found",
			fmt.Sprintf("%v: export %s", entity.ErrNotFound, ref))

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toExportResponse(job))
}

func (s *Server) ListExportEvents(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Events")
	defer endSpan()

	ref, ok := bindExportRef(w, r)
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
	)
}

func (s *Server) DownloadExport(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Exports.Download")
	defer endSpan()

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
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="spenicle-%s.%s"`,
		exportDay(job), extension))
	w.WriteHeader(http.StatusOK)

	if _, copyErr := io.Copy(w, body); copyErr != nil {
		s.deps.Logger.Error(ctx, "export stream failed", slog.String("error", copyErr.Error()))
	}
}

func toExportResponse(job entity.Export) exportResponse {
	out := exportResponse{
		Ref:           job.Ref,
		ClientID:      job.ClientID,
		Status:        job.Status,
		Format:        job.Format,
		SchemaVersion: job.SchemaVersion,
		Counts:        exportCounts(job.CountsJSON),
		Bytes:         job.Bytes,
		CreatedAt:     job.CreatedAt.Format(constant.TimestampLayout),
		ErrorMessage:  job.ErrorMessage,
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
