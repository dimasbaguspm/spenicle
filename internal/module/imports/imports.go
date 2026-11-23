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

const (
	rowFieldOccurredOn  = "occurred_on"
	rowFieldAmountMinor = "amount_minor"
	rowFieldDescription = "description"
	rowFieldCategoryRef = "category_ref"
	rowFieldPayeeRef    = "payee_ref"
	rowFieldStatus      = "status"

	rowFieldCount = 6
)

type ArtifactStore interface {
	Put(ctx context.Context, artifact extraction.Artifact) (filestore.Record, error)
}

type Contract interface {
	Create(ctx context.Context, in CreateInput) (entity.ImportBatch, bool, error)
	AppendChunk(ctx context.Context, in ChunkInput) (ChunkResult, error)
	List(ctx context.Context, filter entity.ImportFilter) ([]entity.ImportBatch, error)
	Get(ctx context.Context, ref string) (entity.ImportBatch, error)
	PatchRow(ctx context.Context, ref string, index int64, update RowUpdate) (entity.ImportBatch, error)
	Review(ctx context.Context, ref string, review Review) (entity.ImportBatch, error)
	ListEvents(ctx context.Context, ref string, filter entity.ImportEventFilter) ([]entity.ImportEvent, error)
}

type PartFiles interface {
	Append(ctx context.Context, key string, chunk []byte) (int64, error)
	Truncate(ctx context.Context, key string, size int64) error
	Read(ctx context.Context, key string) ([]byte, error)
	Remove(ctx context.Context, key string) error
}

type CreateInput struct {
	ClientID   string
	AccountRef string
	Filename   string
	FileHash   string
	Statement  []byte
}

type ChunkInput struct {
	ClientID   string
	AccountRef string
	Filename   string
	ChunkIndex int
	ChunkTotal int
	Bytes      []byte
}

type ChunkResult struct {
	Upload   entity.ImportUpload
	Batch    entity.ImportBatch
	Created  bool
	Repeated bool
}

func (r ChunkResult) Complete() bool { return r.Batch.Ref != "" }

type Options struct {
	MaxRows     int
	CommitChunk int
}

type RowUpdate struct {
	OccurredOn  *time.Time
	AmountMinor *int64
	Description *string
	CategoryRef *string
	PayeeRef    *string
	Status      *string
}

type Review struct {
	Action string
	Reason string
}

func (u RowUpdate) DescribesNothing() bool {
	return len(u.Fields()) == 0
}

func (u RowUpdate) Fields() []string {
	fields := make([]string, 0, rowFieldCount)

	if u.OccurredOn != nil {
		fields = append(fields, rowFieldOccurredOn)
	}

	if u.AmountMinor != nil {
		fields = append(fields, rowFieldAmountMinor)
	}

	if u.Description != nil {
		fields = append(fields, rowFieldDescription)
	}

	if u.CategoryRef != nil {
		fields = append(fields, rowFieldCategoryRef)
	}

	if u.PayeeRef != nil {
		fields = append(fields, rowFieldPayeeRef)
	}

	if u.Status != nil {
		fields = append(fields, rowFieldStatus)
	}

	return fields
}
