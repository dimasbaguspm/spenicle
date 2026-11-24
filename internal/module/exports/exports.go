// Package exports turns "take the whole ledger out" into a durable job: a queued
// row, the worker that claims it, the rendered blob it leaves behind and the
// append-only trail of what happened. A download is never rendered on the fly, so
// a slow or failing read costs a job, not a request.
//
// This file is the package's contract; service.go implements it.
package exports

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository"
)

const (
	maxClaim  = 5
	maxSweep  = 20
	maxResume = 200
)

type ArtifactStore interface {
	Remove(ctx context.Context, sha string) error
}

type Jobs interface {
	repository.Exports
	repository.ExportQueue
}

type Contract interface {
	Create(ctx context.Context, in CreateInput) (entity.Export, bool, error)
	Get(ctx context.Context, ref string) (entity.Export, bool, error)
	List(ctx context.Context, filter entity.ExportFilter) ([]entity.Export, error)
	Events(ctx context.Context, ref string, filter entity.ExportEventFilter) ([]entity.ExportEvent, error)
	Download(ctx context.Context, ref string) (entity.Export, error)
	Claim(ctx context.Context, limit int) ([]entity.Export, error)
	Complete(
		ctx context.Context,
		ref, fileHash string,
		bytes int64,
		counts map[string]int,
	) (entity.Export, error)
	Fail(ctx context.Context, ref, message string) (entity.Export, error)
	Sweep(ctx context.Context, staleBefore time.Time) (Summary, error)
	Resume(ctx context.Context) (int, error)
}

type CreateInput struct {
	ClientID string
	Format   string
	FromOn   *time.Time
	ToOn     *time.Time
}

type Summary struct {
	Swept   int
	Expired int
}
