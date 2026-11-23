// Package export hands the whole ledger out of the process: one deterministic
// JSON document, or one zip of CSV sheets plus a manifest. It writes refs only,
// money as minor-unit strings, and never a sealed value, an artifact byte or an
// integer id. Nothing here writes: import is a separate slice.
package export

import (
	"bytes"
	"context"
	"io"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const pageLimit = 200

type TimeSource interface{ Now() time.Time }

type Deps struct {
	Ledger        repository.Ledger
	Captures      repository.Captures
	Accounts      repository.Accounts
	Payees        repository.Payees
	Recurring     repository.Recurring
	CustomQueries repository.CustomQueries
	Rates         repository.RateStore
	System        repository.System
	Clock         TimeSource
	BaseCurrency  string
}

func JSON(ctx context.Context, deps Deps) (io.ReadCloser, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.JSON")
	defer endSpan()

	snapshot, err := collect(ctx, deps)
	if err != nil {
		return nil, err
	}

	reader, writer := io.Pipe()

	go func() {
		writer.CloseWithError(encodeJSON(snapshot, writer))
	}()

	return reader, nil
}

func CSV(ctx context.Context, deps Deps) (io.ReadCloser, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Export.CSV")
	defer endSpan()

	snapshot, err := collect(ctx, deps)
	if err != nil {
		return nil, err
	}

	archive, err := encodeZIP(snapshot)
	if err != nil {
		return nil, err
	}

	return io.NopCloser(bytes.NewReader(archive)), nil
}
