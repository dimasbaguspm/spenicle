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

func Render(ctx context.Context, deps Deps, format string) (Document, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.Render")
	defer endSpan()

	snapshot, err := collect(ctx, deps)
	if err != nil {
		return Document{}, err
	}

	switch format {
	case constant.ExportFormatJSON:
		return renderJSON(snapshot)
	case constant.ExportFormatCSV:
		return renderZIP(snapshot)
	default:
		return Document{}, fmt.Errorf("unknown export format %q", format)
	}
}

func renderJSON(snapshot *snapshot) (Document, error) {
	var body bytes.Buffer

	if err := encodeJSON(snapshot, &body); err != nil {
		return Document{}, err
	}

	return Document{
		Bytes:       body.Bytes(),
		ContentType: contentTypeJSON,
		Extension:   extensionJSON,
		Counts:      snapshot.counts(),
	}, nil
}

func renderZIP(snapshot *snapshot) (Document, error) {
	archive, err := encodeZIP(snapshot)
	if err != nil {
		return Document{}, err
	}

	return Document{
		Bytes:       archive,
		ContentType: contentTypeZIP,
		Extension:   extensionZIP,
		Counts:      snapshot.counts(),
	}, nil
}
