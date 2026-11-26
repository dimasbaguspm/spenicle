package imports

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
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
	batches    repository.Imports
	events     repository.ImportEvents
	entries    repository.Ledger
	accounts   repository.Accounts
	postings   ledger.Contract
	blobs      ArtifactStore
	parts      PartFiles
	base       BaseCurrencySource
	clock      TimeSource
	options    Options
	chunkLocks sync.Map
}

type (
	BaseCurrencySource interface {
		BaseCurrency(ctx context.Context) (string, error)
	}
	TimeSource interface{ Now() time.Time }
)

func New(
	batches repository.Imports,
	events repository.ImportEvents,
	entries repository.Ledger,
	accounts repository.Accounts,
	postings ledger.Contract,
	blobs ArtifactStore,
	parts PartFiles,
	base BaseCurrencySource,
	clock TimeSource,
	options Options,
) *Service {
	if options.CommitChunk < 1 {
		options.CommitChunk = 1
	}

	return &Service{
		batches: batches, events: events, entries: entries, accounts: accounts,
		postings: postings, blobs: blobs, parts: parts, base: base, clock: clock,
		options: options,
	}
}

var _ Contract = (*Service)(nil)

type statementRow struct {
	OccurredOn  time.Time
	AmountMinor int64
	Currency    string
	Description string
	Valid       bool
}

type eventFields struct {
	Fields []string `json:"fields"`
}

type eventReason struct {
	Reason string `json:"reason"`
}

type commitProgress struct {
	RowsDone  int `json:"rows_done"`
	RowsTotal int `json:"rows_total"`
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

	if err := s.record(ctx, saved, constant.ImportEventUploaded, ""); err != nil {
		return entity.ImportBatch{}, false, err
	}

	return saved, true, nil
}

func (s *Service) AppendChunk(ctx context.Context, in ChunkInput) (ChunkResult, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.AppendChunk")
	defer endSpan()

	lockValue, _ := s.chunkLocks.LoadOrStore(in.ClientID, &sync.Mutex{})
	lock, _ := lockValue.(*sync.Mutex)
	lock.Lock()
	defer lock.Unlock()

	existing, found, err := s.batches.ImportBatchByClientID(ctx, in.ClientID)
	if err != nil {
		return ChunkResult{}, err
	}

	if found {
		batch, _, resumeErr := s.resume(ctx, existing, "")

		return ChunkResult{Batch: batch}, resumeErr
	}

	upload, err := s.upload(ctx, in)
	if err != nil {
		return ChunkResult{}, err
	}

	if checkErr := checkChunk(upload, in); checkErr != nil {
		return ChunkResult{}, checkErr
	}

	repeated, err := s.storeChunk(ctx, upload, in)
	if err != nil {
		return ChunkResult{}, err
	}

	upload, found, err = s.batches.ImportUploadByRef(ctx, upload.Ref)
	if err != nil {
		return ChunkResult{}, err
	}

	if !found {
		return ChunkResult{}, fmt.Errorf("%w: import upload %s", entity.ErrNotFound, upload.Ref)
	}

	if upload.ReceivedChunks < upload.ChunkTotal {
		return ChunkResult{Upload: upload, Repeated: repeated}, nil
	}

	return s.assemble(ctx, upload, in)
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

	if batch.IsCommitting() {
		return entity.ImportBatch{}, fmt.Errorf("%w: %s is %s", entity.ErrImportCommitting, ref, batch.Status)
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
	previous := row.Status
	fields := update.Fields()
	rowIndex := row.RowIndex

	applyUpdate(&row, update)

	row.UpdatedAt = now
	row.EditedAt = firstEdit(row.EditedAt, now)
	row.EditedFields = mergeFields(row.EditedFields, fields)

	events := []entity.ImportEvent{
		s.makeEvent(batch, constant.ImportEventRowEdited, &rowIndex,
			jsonPayload(eventFields{Fields: fields})),
	}

	if kind := statusEvent(previous, row.Status); kind != "" {
		events = append(events, s.makeEvent(batch, kind, &rowIndex, ""))
	}

	batch.ExpiresAt = now.Add(draftTTL)
	if _, err := s.batches.EditImportRow(ctx, row, batch.ExpiresAt, events); err != nil {
		return entity.ImportBatch{}, err
	}

	return s.load(ctx, batch)
}

func (s *Service) Review(ctx context.Context, ref string, review Review) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Review")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	switch review.Action {
	case constant.ImportActionCommit:
		return s.commit(ctx, batch)
	case constant.ImportActionReject:
		return s.reject(ctx, batch, review)
	default:
		return entity.ImportBatch{}, fmt.Errorf("%w: action %q",
			entity.ErrInvalidImport, review.Action)
	}
}

func (s *Service) ListEvents(
	ctx context.Context,
	ref string,
	filter entity.ImportEventFilter,
) ([]entity.ImportEvent, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.ListEvents")
	defer endSpan()

	batch, found, err := s.batches.ImportBatchByRef(ctx, ref)
	if err != nil {
		return nil, err
	}

	if !found {
		return nil, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, ref)
	}

	filter.BatchID = batch.ID

	return s.events.ListImportEvents(ctx, filter)
}

func (s *Service) commit(
	ctx context.Context,
	batch entity.ImportBatch,
) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Commit")
	defer endSpan()

	switch batch.Status {
	case constant.ImportStatusCommitted:
		return s.load(ctx, batch)
	case constant.ImportStatusCommitting:
		return s.resumeCommit(ctx, batch)
	case constant.ImportStatusDraft:
	default:
		return entity.ImportBatch{}, closedError(batch)
	}

	begun, err := s.batches.BeginImportCommit(ctx, batch.Ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !begun {
		return s.commitRace(ctx, batch)
	}

	batch.Status = constant.ImportStatusCommitting

	return s.postChunks(ctx, batch, false)
}

func (s *Service) commitRace(
	ctx context.Context,
	batch entity.ImportBatch,
) (entity.ImportBatch, error) {
	fresh, found, err := s.batches.ImportBatchByRef(ctx, batch.Ref)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if !found {
		return entity.ImportBatch{}, fmt.Errorf("%w: import batch %s", entity.ErrNotFound, batch.Ref)
	}

	switch fresh.Status {
	case constant.ImportStatusCommitted:
		return s.load(ctx, fresh)
	case constant.ImportStatusCommitting:
		return s.resumeCommit(ctx, fresh)
	default:
		return entity.ImportBatch{}, closedError(fresh)
	}
}

func (s *Service) resumeCommit(
	ctx context.Context,
	batch entity.ImportBatch,
) (entity.ImportBatch, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.ResumeCommit")
	defer endSpan()

	return s.postChunks(ctx, batch, true)
}

func (s *Service) postChunks(
	ctx context.Context,
	batch entity.ImportBatch,
	resume bool,
) (entity.ImportBatch, error) {
	rows, err := s.batches.ImportRows(ctx, batch.ID)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	accepted := acceptedOnly(rows)
	total := len(accepted)

	pending := accepted
	if resume {
		pending, err = s.pendingRows(ctx, batch, rows)
		if err != nil {
			return entity.ImportBatch{}, err
		}
	}

	category, err := s.unsorted(ctx)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	pendingTotal := total - len(pending)

	if postErr := s.postPending(ctx, batch, pending, category.Ref, pendingTotal, total); postErr != nil {
		return entity.ImportBatch{}, postErr
	}

	closed, err := s.batches.CloseImportBatch(
		ctx, batch.Ref, constant.ImportStatusCommitted, constant.ImportStatusCommitting,
		s.clock.Now(), s.makeEvent(batch, constant.ImportEventCommitted, nil, ""),
	)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	closed.Rows = rows

	return closed, nil
}

func (s *Service) postPending(
	ctx context.Context,
	batch entity.ImportBatch,
	pending []entity.ImportRow,
	categoryRef string,
	done, total int,
) error {
	for start := 0; start < len(pending); start += s.options.CommitChunk {
		if err := ctx.Err(); err != nil {
			return fmt.Errorf("commit cancelled between chunks: %w", err)
		}

		end := min(start+s.options.CommitChunk, len(pending))

		for _, row := range pending[start:end] {
			if err := s.postRow(ctx, batch, row, categoryRef); err != nil {
				return err
			}
		}

		done += end - start

		payload := jsonPayload(commitProgress{RowsDone: done, RowsTotal: total})
		if err := s.record(ctx, batch, constant.ImportEventCommitting, payload); err != nil {
			return err
		}
	}

	return nil
}

func (s *Service) pendingRows(
	ctx context.Context,
	batch entity.ImportBatch,
	rows []entity.ImportRow,
) ([]entity.ImportRow, error) {
	pending := make([]entity.ImportRow, 0, len(rows))

	for _, row := range rows {
		if row.Status != constant.ImportRowStatusAccepted {
			continue
		}

		_, posted, err := s.entries.EntryByClientID(ctx, rowClientID(batch.FileHash, row.RowIndex))
		if err != nil {
			return nil, fmt.Errorf("resume probe: %w", err)
		}

		if posted {
			continue
		}

		pending = append(pending, row)
	}

	return pending, nil
}

func (s *Service) reject(
	ctx context.Context,
	batch entity.ImportBatch,
	review Review,
) (entity.ImportBatch, error) {
	if batch.Status == constant.ImportStatusRejected {
		return s.load(ctx, batch)
	}

	if batch.Status != constant.ImportStatusDraft {
		return entity.ImportBatch{}, closedError(batch)
	}

	payload := ""
	if review.Reason != "" {
		payload = jsonPayload(eventReason{review.Reason})
	}

	closed, err := s.batches.CloseImportBatch(
		ctx, batch.Ref, constant.ImportStatusRejected, constant.ImportStatusDraft,
		s.clock.Now(), s.makeEvent(batch, constant.ImportEventRejected, nil, payload),
	)
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
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.PostRow")
	defer endSpan()

	if row.CategoryRef != "" {
		categoryRef = row.CategoryRef
	}

	_, _, err := s.postings.Post(ctx, ledger.PostInput{
		ClientID:   rowClientID(batch.FileHash, row.RowIndex),
		OccurredOn: row.OccurredOn,
		PayeeRef:   row.PayeeRef,
		Note:       row.Description,
		Currency:   batchCurrency(row, batch),
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
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Draft")
	defer endSpan()

	parsed, err := parseStatement(in.Statement)
	if err != nil {
		return entity.ImportBatch{}, err
	}

	if s.options.MaxRows > 0 && len(parsed) > s.options.MaxRows {
		return entity.ImportBatch{}, fmt.Errorf("%w: %d rows, the limit is %d",
			entity.ErrInvalidImport, len(parsed), s.options.MaxRows)
	}

	telemetry.RecordImportRows(ctx, int64(len(parsed)))

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
		CreatedAt: now, ExpiresAt: now.Add(draftTTL),
	}

	for index, row := range parsed {
		rowCurrency := currency
		if row.Currency != "" {
			rowCurrency = row.Currency
		}

		built := entity.ImportRow{
			RowIndex:    index,
			OccurredOn:  row.OccurredOn,
			AmountMinor: row.AmountMinor,
			Currency:    rowCurrency,
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

		if err := s.detect(ctx, in.FileHash, rowCurrency, &built); err != nil {
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
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Detect")
	defer endSpan()

	existing, found, err := s.entries.EntryByClientID(ctx, rowClientID(fileHash, row.RowIndex))
	if err != nil {
		return fmt.Errorf("already imported probe: %w", err)
	}

	if found {
		row.Status = constant.ImportRowStatusSkipped
		row.ClashKind = constant.ImportClashAlreadyImported
		row.ClashEntryRef = existing.Ref

		telemetry.RecordImportClash(ctx, constant.ImportClashAlreadyImported)

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

			telemetry.RecordImportClash(ctx, clash)

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
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense,
	)
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
	if fileHash != "" && batch.FileHash != fileHash {
		if err := s.record(ctx, batch, constant.ImportEventConflictRefused, ""); err != nil {
			return entity.ImportBatch{}, false, err
		}

		return entity.ImportBatch{}, false, fmt.Errorf("%w: %s", entity.ErrImportConflict, batch.ClientID)
	}

	if err := s.record(ctx, batch, constant.ImportEventResumed, ""); err != nil {
		return entity.ImportBatch{}, false, err
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

func (s *Service) makeEvent(
	batch entity.ImportBatch,
	kind string,
	rowIndex *int,
	payload string,
) entity.ImportEvent {
	return entity.ImportEvent{
		BatchID:  batch.ID,
		Kind:     kind,
		RowIndex: rowIndex,
		Payload:  payload,
		Actor:    constant.ImportActorUser,
		At:       s.clock.Now(),
	}
}

func (s *Service) record(
	ctx context.Context,
	batch entity.ImportBatch,
	kind string,
	payload string,
) error {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Record")
	defer endSpan()

	_, err := s.events.InsertImportEvent(ctx, s.makeEvent(batch, kind, nil, payload))
	if err != nil {
		return fmt.Errorf("record %s event: %w", kind, err)
	}

	return nil
}

func closedError(batch entity.ImportBatch) error {
	return fmt.Errorf("%w: %s is %s", entity.ErrImportClosed, batch.Ref, batch.Status)
}

func firstEdit(edited *time.Time, now time.Time) *time.Time {
	if edited != nil {
		return edited
	}

	return &now
}

func mergeFields(existing string, added []string) string {
	seen := make(map[string]struct{}, len(added)+1)
	fields := make([]string, 0, len(added)+1)

	for _, field := range append(strings.Split(existing, ","), added...) {
		trimmed := strings.TrimSpace(field)
		if trimmed == "" {
			continue
		}

		if _, ok := seen[trimmed]; ok {
			continue
		}

		seen[trimmed] = struct{}{}
		fields = append(fields, trimmed)
	}

	sort.Strings(fields)

	return strings.Join(fields, ",")
}

func statusEvent(previous, current string) string {
	if previous == current {
		return ""
	}

	switch current {
	case constant.ImportRowStatusAccepted:
		return constant.ImportEventRowAccepted
	case constant.ImportRowStatusSkipped:
		return constant.ImportEventRowSkipped
	default:
		return ""
	}
}

func jsonPayload(value any) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		return ""
	}

	return string(encoded)
}

func parseStatement(body []byte) ([]statementRow, error) {
	reader := csv.NewReader(bytes.NewReader(body))
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf(
			"%w: the header must include occurred_on, amount_minor and description",
			entity.ErrInvalidImport,
		)
	}

	index := map[string]int{}
	for i, h := range header {
		index[strings.TrimSpace(h)] = i
	}

	for _, required := range []string{"occurred_on", "amount_minor", "description"} {
		if _, ok := index[required]; !ok {
			return nil, fmt.Errorf("%w: the header must include %q", entity.ErrInvalidImport, required)
		}
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

		out = append(out, parseRow(record, index))
	}

	return out, nil
}

func parseRow(record []string, index map[string]int) statementRow {
	get := func(name string) string {
		if i, ok := index[name]; ok && i < len(record) {
			return strings.TrimSpace(record[i])
		}

		return ""
	}

	occurredOn, err := validating.Day(get("occurred_on"), "occurred_on")
	if err != nil {
		return unreadableRow()
	}

	amount, err := validating.Money(get("amount_minor"), "amount_minor")
	if err != nil {
		return unreadableRow()
	}

	description := get("description")
	if len([]rune(description)) > maxDescription {
		return unreadableRow()
	}

	row := statementRow{
		OccurredOn:  occurredOn,
		AmountMinor: amount,
		Description: description,
		Valid:       true,
	}
	if cur := get("currency"); cur != "" {
		row.Currency = cur
	}

	return row
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

func checkChunk(upload entity.ImportUpload, in ChunkInput) error {
	if !upload.IsOpen() {
		return fmt.Errorf("%w: upload %s is %s",
			entity.ErrImportClosed, upload.Ref, upload.Status)
	}

	if in.ChunkTotal != upload.ChunkTotal {
		return fmt.Errorf("%w: upload %s takes %d chunks, got %d",
			entity.ErrImportChunkConflict, upload.Ref, upload.ChunkTotal, in.ChunkTotal)
	}

	if in.ChunkIndex < 0 || in.ChunkIndex >= upload.ChunkTotal {
		return fmt.Errorf("%w: chunk %d is outside 0..%d",
			entity.ErrInvalidImport, in.ChunkIndex, upload.ChunkTotal-1)
	}

	return nil
}

func acceptedOnly(rows []entity.ImportRow) []entity.ImportRow {
	accepted := make([]entity.ImportRow, 0, len(rows))

	for _, row := range rows {
		if row.Status == constant.ImportRowStatusAccepted {
			accepted = append(accepted, row)
		}
	}

	return accepted
}

func (s *Service) upload(ctx context.Context, in ChunkInput) (entity.ImportUpload, error) {
	upload, found, err := s.batches.ImportUploadByClientID(ctx, in.ClientID)
	if err != nil {
		return entity.ImportUpload{}, err
	}

	if found {
		return upload, nil
	}

	now := s.clock.Now()

	created, err := s.batches.InsertImportUpload(ctx, entity.ImportUpload{
		ClientID:   in.ClientID,
		Filename:   in.Filename,
		ChunkTotal: in.ChunkTotal,
		Status:     constant.ImportUploadStatusOpen,
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if err != nil {
		return entity.ImportUpload{}, fmt.Errorf("open upload: %w", err)
	}

	return created, nil
}

func (s *Service) storeChunk(
	ctx context.Context,
	upload entity.ImportUpload,
	in ChunkInput,
) (bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.StoreChunk")
	defer endSpan()

	sum := sha256.Sum256(in.Bytes)
	chunkHash := hex.EncodeToString(sum[:])

	size, err := s.parts.Append(ctx, in.ClientID, in.Bytes)
	if err != nil {
		return false, err
	}

	inserted, err := s.batches.AppendImportChunk(
		ctx, upload.Ref, in.ChunkIndex, int64(len(in.Bytes)), chunkHash, s.clock.Now(),
	)
	if err != nil {
		return false, errors.Join(err, s.parts.Truncate(ctx, in.ClientID, size-int64(len(in.Bytes))))
	}

	if inserted {
		return false, nil
	}

	return true, s.parts.Truncate(ctx, in.ClientID, size-int64(len(in.Bytes)))
}

func (s *Service) assemble(
	ctx context.Context,
	upload entity.ImportUpload,
	in ChunkInput,
) (ChunkResult, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Imports.Assemble")
	defer endSpan()

	body, err := s.parts.Read(ctx, in.ClientID)
	if err != nil {
		return ChunkResult{}, err
	}

	sum := sha256.Sum256(body)
	fileHash := hex.EncodeToString(sum[:])

	batch, created, err := s.Create(ctx, CreateInput{
		ClientID:   in.ClientID,
		AccountRef: in.AccountRef,
		Filename:   upload.Filename,
		FileHash:   fileHash,
		Statement:  body,
	})
	if err != nil {
		return ChunkResult{}, err
	}

	now := s.clock.Now()

	if _, err := s.batches.CompleteImportUpload(ctx, upload.Ref, fileHash, now); err != nil {
		return ChunkResult{}, err
	}

	if err := s.parts.Remove(ctx, in.ClientID); err != nil {
		return ChunkResult{}, err
	}

	upload.Status = constant.ImportUploadStatusComplete
	upload.FileHash = fileHash
	upload.CompletedAt = &now

	return ChunkResult{Upload: upload, Batch: batch, Created: created}, nil
}

func batchCurrency(row entity.ImportRow, batch entity.ImportBatch) string {
	if row.Currency != "" {
		return row.Currency
	}

	return batch.Currency
}
