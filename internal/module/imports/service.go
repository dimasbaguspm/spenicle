package imports

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

const (
	statementHeader  = "occurred_on,amount_minor,description"
	statementColumns = 3
	maxDescription   = 500
	draftTTL         = 24 * time.Hour
	possibleWindow   = 3
	clientIDPrefix   = "import:"
	statementType    = "text/csv"
)

type Service struct {
	batches  repository.Imports
	entries  repository.Ledger
	accounts repository.Accounts
	postings ledger.Contract
	blobs    ArtifactStore
	base     BaseCurrencySource
	clock    TimeSource
}

type (
	BaseCurrencySource interface {
		BaseCurrency(ctx context.Context) (string, error)
	}
	TimeSource interface{ Now() time.Time }
)

func New(
	batches repository.Imports,
	entries repository.Ledger,
	accounts repository.Accounts,
	postings ledger.Contract,
	blobs ArtifactStore,
	base BaseCurrencySource,
	clock TimeSource,
) *Service {
	return &Service{
		batches: batches, entries: entries, accounts: accounts,
		postings: postings, blobs: blobs, base: base, clock: clock,
	}
}

var _ Contract = (*Service)(nil)

type statementRow struct {
	OccurredOn  time.Time
	AmountMinor int64
	Description string
	Valid       bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (entity.ImportBatch, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Create")
	defer endSpan()

	existing, found, err := s.batches.ImportBatchByClientID(ctx, in.ClientID)
	if err != nil {
		return entity.ImportBatch{}, false, err
	}

	if found {
		return s.resume(ctx, existing, in.FileHash)
	}

	draft, err := s.draft(ctx, in, s.clock.Now())
	if err != nil {
		return entity.ImportBatch{}, false, err
	}

	if storeErr := s.storeStatement(ctx, in); storeErr != nil {
		return entity.ImportBatch{}, false, storeErr
	}

	saved, err := s.batches.InsertImportBatch(ctx, draft)
	if err != nil {
		return s.raced(ctx, in, err)
	}

	return saved, true, nil
}

func (s *Service) List(
	ctx context.Context,
	filter entity.ImportFilter,
) ([]entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.List")
	defer endSpan()

	return s.batches.ListImportBatches(ctx, filter)
}

func (s *Service) Get(ctx context.Context, ref string) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Get")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	return s.load(ctx, batch)
}

func (s *Service) PatchRow(
	ctx context.Context,
	ref string,
	index int64,
	update RowUpdate,
) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.PatchRow")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	if batch.IsClosed() {
		return entity.ImportBatch{}, fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, ref, batch.Status)
	}

	rows, err := s.batches.ImportRows(ctx, batch.ID)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	row, err := findRow(rows, index)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	now := s.clock.Now()

	applyUpdate(&row, update)

	row.UpdatedAt = now
	if _, err := s.batches.UpdateImportRow(ctx, row); err != nil {
		return entity.ImportBatch{}, err
	}

	batch.ExpiresAt = now.Add(draftTTL)
	if err := s.batches.ExtendImportBatch(ctx, ref, batch.ExpiresAt); err != nil {
		return entity.ImportBatch{}, err
	}

	return s.load(ctx, batch)
}

func (s *Service) Commit(ctx context.Context, ref string) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Commit")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	if batch.Status == constant.ImportStatusCommitted {
		return s.load(ctx, batch)
	}

	if batch.Status != constant.ImportStatusDraft {
		return entity.ImportBatch{}, fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, ref, batch.Status)
	}

	rows, err := s.batches.ImportRows(ctx, batch.ID)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	category, err := s.unsorted(ctx)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	for _, row := range rows {
		if row.Status != constant.ImportRowStatusAccepted {
			continue
		}

		if postErr := s.postRow(ctx, batch, row, category.Ref); postErr != nil {
			return entity.ImportBatch{}, postErr
		}
	}

	closed, err := s.batches.CloseImportBatch(ctx, ref, constant.ImportStatusCommitted, s.clock.Now())
	if err != nil {
		return entity.ImportBatch{}, err
	}

	closed.Rows = rows

	return closed, nil
}

func (s *Service) Reject(ctx context.Context, ref string) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Reject")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	if batch.Status == constant.ImportStatusRejected {
		return s.load(ctx, batch)
	}

	if batch.Status != constant.ImportStatusDraft {
		return entity.ImportBatch{}, fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, ref, batch.Status)
	}

	closed, err := s.batches.CloseImportBatch(ctx, ref, constant.ImportStatusRejected, s.clock.Now())
	if err != nil {
		return entity.ImportBatch{}, err
	}

	return s.load(ctx, closed)
}

func (s *Service) postRow(
	ctx context.Context,
	batch entity.ImportBatch,
	row entity.ImportRow,
	categoryRef string,
) error {
	if row.CategoryRef != "" {
		categoryRef = row.CategoryRef
	}

	_, _, err := s.postings.Post(ctx, ledger.PostInput{
		ClientID:   rowClientID(batch.FileHash, row.RowIndex),
		OccurredOn: row.OccurredOn,
		PayeeRef:   row.PayeeRef,
		Note:       row.Description,
		Currency:   batch.Currency,
		Source:     constant.EntrySourceStatement,
		Postings: []ledger.PostingInput{
			{AccountRef: row.AccountRef, AmountMinor: -row.AmountMinor},
			{AccountRef: categoryRef, AmountMinor: row.AmountMinor},
		},
	})
	if err != nil {
		return fmt.Errorf("post import row %d: %w", row.RowIndex, err)
	}

	return nil
}

func (s *Service) draft(ctx context.Context, in CreateInput, now time.Time) (entity.ImportBatch, error) {
	parsed, err := parseStatement(in.Statement)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	account, err := s.defaultAccount(ctx, in.AccountRef)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	currency, err := s.base.BaseCurrency(ctx)
	if err != nil {
		return entity.ImportBatch{}, fmt.Errorf("base currency: %w", err)
	}

	batch := entity.ImportBatch{
		ClientID:  in.ClientID,
		FileHash:  in.FileHash,
		Filename:  in.Filename,
		Status:    constant.ImportStatusDraft,
		RowsTotal: len(parsed),
		Currency:  currency,
		CreatedAt: now,
		ExpiresAt: now.Add(draftTTL),
	}

	for index, row := range parsed {
		built := entity.ImportRow{
			RowIndex:    index,
			OccurredOn:  row.OccurredOn,
			AmountMinor: row.AmountMinor,
			Description: row.Description,
			AccountRef:  account.Ref,
			Status:      constant.ImportRowStatusPending,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if !row.Valid {
			built.Status = constant.ImportRowStatusSkipped
			built.ClashKind = constant.ImportClashInvalidRow

			batch.Rows = append(batch.Rows, built)

			continue
		}

		if err := s.detect(ctx, in.FileHash, currency, &built); err != nil {
			return entity.ImportBatch{}, err
		}

		batch.Rows = append(batch.Rows, built)
	}

	return batch, nil
}

func (s *Service) detect(
	ctx context.Context,
	fileHash, currency string,
	row *entity.ImportRow,
) error {
	existing, found, err := s.entries.EntryByClientID(ctx, rowClientID(fileHash, row.RowIndex))
	if err != nil {
		return fmt.Errorf("already imported probe: %w", err)
	}

	if found {
		row.Status = constant.ImportRowStatusSkipped
		row.ClashKind = constant.ImportClashAlreadyImported
		row.ClashEntryRef = existing.Ref

		return nil
	}

	probe := entity.EntryProbe{
		OccurredOn:  row.OccurredOn,
		Currency:    currency,
		AmountMinor: absolute(row.AmountMinor),
		AccountRef:  row.AccountRef,
	}

	for _, clash := range []string{constant.ImportClashDuplicate, constant.ImportClashPossible} {
		if clash == constant.ImportClashPossible {
			probe.DayWindow = possibleWindow
		}

		ref, hit, matchErr := s.entries.MatchingEntryRef(ctx, probe)
		if matchErr != nil {
			return fmt.Errorf("clash probe: %w", matchErr)
		}

		if hit {
			row.Status = constant.ImportRowStatusSkipped
			row.ClashKind = clash
			row.ClashEntryRef = ref

			return nil
		}
	}

	return nil
}

func (s *Service) defaultAccount(ctx context.Context, ref string) (entity.Account, error) {
	if ref == "" {
		return s.unsorted(ctx)
	}

	account, found, err := s.accounts.AccountByRef(ctx, ref)
	if err != nil {
		return entity.Account{}, fmt.Errorf("import account: %w", err)
	}

	if !found {
		return entity.Account{}, fmt.Errorf("%w: account %s", entity.ErrNotFound, ref)
	}

	return account, nil
}

func (s *Service) unsorted(ctx context.Context) (entity.Account, error) {
	account, found, err := s.accounts.FindAccount(
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense)
	if err != nil {
		return entity.Account{}, fmt.Errorf("unsorted account: %w", err)
	}

	if !found {
		return entity.Account{}, fmt.Errorf("%w: account %s",
			entity.ErrNotFound, constant.SeedExpenseAccount)
	}

	return account, nil
}

func (s *Service) resume(
	ctx context.Context,
	batch entity.ImportBatch,
	fileHash string,
) (entity.ImportBatch, bool, error) {
	if batch.FileHash != fileHash {
		return entity.ImportBatch{}, false, fmt.Errorf("%w: %s", entity.ErrImportConflict, batch.ClientID)
	}

	loaded, err := s.load(ctx, batch)
	if err != nil {
		return entity.ImportBatch{}, false, err
	}

	return loaded, false, nil
}

func (s *Service) raced(
	ctx context.Context,
	in CreateInput,
	cause error,
) (entity.ImportBatch, bool, error) {
	existing, found, err := s.batches.ImportBatchByClientID(ctx, in.ClientID)
	if err != nil || !found {
		return entity.ImportBatch{}, false, cause
	}

	return s.resume(ctx, existing, in.FileHash)
}

func (s *Service) load(ctx context.Context, batch entity.ImportBatch) (entity.ImportBatch, error) {
	rows, err := s.batches.ImportRows(ctx, batch.ID)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	batch.Rows = rows

	return batch, nil
}

func applyUpdate(row *entity.ImportRow, update RowUpdate) {
	if update.OccurredOn != nil {
		row.OccurredOn = *update.OccurredOn
	}

	if update.AmountMinor != nil {
		row.AmountMinor = *update.AmountMinor
	}

	if update.Description != nil {
		row.Description = *update.Description
	}

	if update.CategoryRef != nil {
		row.CategoryRef = *update.CategoryRef
	}

	if update.PayeeRef != nil {
		row.PayeeRef = *update.PayeeRef
	}

	if update.Status != nil {
		row.Status = *update.Status
	}
}

func parseStatement(body []byte) ([]statementRow, error) {
	reader := csv.NewReader(bytes.NewReader(body))
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	header, err := reader.Read()
	if err != nil || strings.Join(header, ",") != statementHeader {
		return nil, fmt.Errorf("%w: the header must be %q", entity.ErrInvalidImport, statementHeader)
	}

	out := make([]statementRow, 0)

	for {
		record, readErr := reader.Read()

		if errors.Is(readErr, io.EOF) {
			break
		}

		if readErr != nil {
			out = append(out, unreadableRow())
			break
		}

		out = append(out, parseRow(record))
	}

	return out, nil
}

func parseRow(record []string) statementRow {
	if len(record) != statementColumns {
		return unreadableRow()
	}

	occurredOn, err := time.Parse(constant.DateLayout, strings.TrimSpace(record[0]))
	if err != nil {
		return unreadableRow()
	}

	amount, err := strconv.ParseInt(strings.TrimSpace(record[1]), 10, 64)
	if err != nil {
		return unreadableRow()
	}

	description := strings.TrimSpace(record[2])
	if len([]rune(description)) > maxDescription {
		return unreadableRow()
	}

	return statementRow{
		OccurredOn:  occurredOn,
		AmountMinor: amount,
		Description: description,
		Valid:       true,
	}
}

func unreadableRow() statementRow {
	return statementRow{Description: "unreadable statement row"}
}

func rowClientID(fileHash string, index int) string {
	return clientIDPrefix + fileHash + ":" + strconv.Itoa(index)
}

func absolute(amount int64) int64 {
	if amount < 0 {
		return -amount
	}

	return amount
}

func findRow(rows []entity.ImportRow, index int64) (entity.ImportRow, error) {
	for _, row := range rows {
		if int64(row.RowIndex) == index {
			return row, nil
		}
	}

	return entity.ImportRow{}, fmt.Errorf("%w: import row %d", entity.ErrNotFound, index)
}

func (s *Service) storeStatement(ctx context.Context, in CreateInput) error {
	_, err := s.blobs.Put(ctx, extraction.Artifact{
		Filename:    in.Filename,
		ContentType: statementType,
		Bytes:       in.Statement,
	})
	if err != nil {
		return fmt.Errorf("store statement: %w", err)
	}

	return nil
}
