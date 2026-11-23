package handlers

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/export"
)

const (
	exportCSV     = "csv"
	exportJSON    = "json"
	exportZIP     = "zip"
	exportNoStore = "no-store"
)

type exportQuery struct {
	Format string `query:"format" validate:"omitempty,oneof=json csv"`
}

func (s *Server) Export(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Export")
	defer endSpan()

	var query exportQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	body, err := s.exportBody(ctx, query.Format)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	defer func() { _ = body.Close() }()

	contentType, extension := exportFormat(query.Format)

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", exportNoStore)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="spenicle-%s.%s"`,
		s.deps.Export.Clock.Now().UTC().Format(constant.DateLayout), extension))
	w.WriteHeader(http.StatusOK)

	if _, copyErr := io.Copy(w, body); copyErr != nil {
		s.deps.Logger.ErrorContext(ctx, "export stream failed", slog.String("error", copyErr.Error()))
	}
}

func (s *Server) exportBody(ctx context.Context, format string) (io.ReadCloser, error) {
	if format == exportCSV {
		return export.CSV(ctx, s.deps.Export)
	}

	return export.JSON(ctx, s.deps.Export)
}

func exportFormat(format string) (string, string) {
	if format == exportCSV {
		return "application/zip", exportZIP
	}

	return "application/json", exportJSON
}
