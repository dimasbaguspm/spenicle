// Package export hands the whole ledger out of the process: one deterministic
// JSON document, or one zip of CSV sheets plus a manifest and a summary. It
// writes refs only, money as minor-unit strings, and never a sealed value, an
// artifact byte or an integer id. Nothing here writes: import is a separate
// slice, and the worker is what turns a render into a stored job.
package export

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const (
	pageLimit = 200

	contentTypeJSON = "application/json"
	contentTypeZIP  = "application/zip"

	extensionJSON = "json"
	extensionZIP  = "zip"

	tempPattern = "spenicle-export-*."
)

type TimeSource interface{ Now() time.Time }

type Deps struct {
	Ledger        repository.Ledger
	Exporter      repository.Exporter
	CustomQueries repository.CustomQueries
	Rates         repository.RateStore
	System        repository.System
	Clock         TimeSource
	BaseCurrency  string
}

type Document struct {
	Bytes       []byte
	ContentType string
	Extension   string
	Counts      map[string]int
}

type FileDocument struct {
	Path        string
	ContentType string
	Extension   string
	Counts      map[string]int
}

type Window struct {
	From time.Time
	To   time.Time
}

func Render(ctx context.Context, deps Deps, format string, window *Window) (Document, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.Render")
	defer endSpan()

	contentType, extension, err := formatMetadata(format)
	if err != nil {
		return Document{}, err
	}

	snapshot, err := collect(ctx, deps, window)
	if err != nil {
		return Document{}, err
	}

	var body bytes.Buffer
	if err := encodeDocument(snapshot, format, &body); err != nil {
		return Document{}, err
	}

	return Document{
		Bytes:       body.Bytes(),
		ContentType: contentType,
		Extension:   extension,
		Counts:      snapshot.counts(),
	}, nil
}

func RenderFile(
	ctx context.Context,
	deps Deps,
	format string,
	window *Window,
	dir string,
) (FileDocument, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.RenderFile")
	defer endSpan()

	contentType, extension, err := formatMetadata(format)
	if err != nil {
		return FileDocument{}, err
	}

	snapshot, err := collect(ctx, deps, window)
	if err != nil {
		return FileDocument{}, err
	}

	file, err := os.CreateTemp(dir, tempPattern+extension)
	if err != nil {
		return FileDocument{}, fmt.Errorf("export temp file: %w", err)
	}

	name := file.Name()

	if err := encodeDocument(snapshot, format, file); err != nil {
		_ = file.Close()
		_ = os.Remove(name)

		return FileDocument{}, err
	}

	if err := file.Close(); err != nil {
		_ = os.Remove(name)

		return FileDocument{}, fmt.Errorf("close export file: %w", err)
	}

	return FileDocument{
		Path:        name,
		ContentType: contentType,
		Extension:   extension,
		Counts:      snapshot.counts(),
	}, nil
}

func formatMetadata(format string) (string, string, error) {
	switch format {
	case constant.ExportFormatJSON:
		return contentTypeJSON, extensionJSON, nil
	case constant.ExportFormatCSV:
		return contentTypeZIP, extensionZIP, nil
	default:
		return "", "", fmt.Errorf("unknown export format %q", format)
	}
}

func encodeDocument(snapshot *snapshot, format string, out io.Writer) error {
	switch format {
	case constant.ExportFormatJSON:
		return encodeJSON(snapshot, out)
	case constant.ExportFormatCSV:
		return encodeZIP(snapshot, out)
	default:
		return fmt.Errorf("unknown export format %q", format)
	}
}
