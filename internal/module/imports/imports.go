// Package imports turns an uploaded CSV statement into a durable draft: the rows
// the user reviews one by one, the clash warnings computed at upload, and one
// commit that posts the accepted rows through the ledger. The client's own key
// makes every step idempotent across restarts.
//
// This file is the package's contract; service.go implements it.
package imports

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
)

type ArtifactStore interface {
	Put(ctx context.Context, artifact extraction.Artifact) (filestore.Record, error)
}

type Contract interface {
	Create(ctx context.Context, in CreateInput) (entity.ImportBatch, bool, error)
	List(ctx context.Context, filter entity.ImportFilter) ([]entity.ImportBatch, error)
	Get(ctx context.Context, ref string) (entity.ImportBatch, error)
	PatchRow(ctx context.Context, ref string, index int64, update RowUpdate) (entity.ImportBatch, error)
	Commit(ctx context.Context, ref string) (entity.ImportBatch, error)
	Reject(ctx context.Context, ref string) (entity.ImportBatch, error)
}

type CreateInput struct {
	ClientID   string
	AccountRef string
	Filename   string
	FileHash   string
	Statement  []byte
}

type RowUpdate struct {
	OccurredOn  *time.Time
	AmountMinor *int64
	Description *string
	CategoryRef *string
	PayeeRef    *string
	Status      *string
}

func (u RowUpdate) DescribesNothing() bool {
	return u.OccurredOn == nil && u.AmountMinor == nil && u.Description == nil &&
		u.CategoryRef == nil && u.PayeeRef == nil && u.Status == nil
}
