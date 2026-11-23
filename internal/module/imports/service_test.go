package imports_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/imports"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository/filestore"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const testSecret = "0123456789abcdef"

type baseStub struct{}

func (baseStub) BaseCurrency(context.Context) (string, error) { return "IDR", nil }

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

func (c fixedClock) NewID() string { return fmt.Sprintf("id-%d", c.at.UnixNano()) }

type harness struct {
	service *imports.Service
	store   *sqlite.Store
	post    ledger.Contract
}

func newHarness(t *testing.T, options imports.Options) harness {
	t.Helper()

	ctx := t.Context()
	dir := t.TempDir()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(dir, "imports.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if migrateErr := sqlite.Migrate(ctx, db); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	store := sqlite.NewStore(db)

	if _, baseErr := store.EnsureBaseline(ctx, "IDR", "fingerprint"); baseErr != nil {
		t.Fatalf("baseline: %v", baseErr)
	}

	blobs, err := filestore.New(filepath.Join(dir, "artifacts"), []byte(testSecret))
	if err != nil {
		t.Fatalf("filestore: %v", err)
	}

	parts, err := filestore.NewParts(filepath.Join(dir, "imports"))
	if err != nil {
		t.Fatalf("parts: %v", err)
	}

	at := time.Date(2025, 2, 10, 9, 0, 0, 0, time.UTC)
	source := fixedClock{at: at}

	postings := ledger.New(store, store, store, baseStub{}, source, source)

	return harness{
		store: store,
		post:  postings,
		service: imports.New(
			store, store, store, store, postings, blobs, parts, baseStub{}, source, options,
		),
	}
}

func statement(rows int) []byte {
	var out strings.Builder

	out.WriteString("occurred_on,amount_minor,description\n")

	for index := range rows {
		fmt.Fprintf(&out, "2025-02-%02d,-%d,ROW %d\n", index%28+1, 1000+index, index)
	}

	return []byte(out.String())
}

func TestAppendChunk(t *testing.T) {
	cases := []struct {
		name string
		run  func(t *testing.T, h harness)
	}{
		{name: "the first chunk is accepted with progress", run: firstChunkIsAccepted},
		{name: "the last chunk assembles the draft", run: lastChunkAssemblesTheDraft},
		{name: "a replayed chunk is a no-op", run: replayedChunkIsANoOp},
		{name: "a different chunk total is a conflict", run: anotherChunkTotalIsAConflict},
		{name: "a chunk for a closed upload is refused", run: aClosedUploadRefusesChunks},
		{name: "a statement above the row limit is refused", run: tooManyRowsIsRefused},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			testCase.run(t, newHarness(t, imports.Options{MaxRows: 2, CommitChunk: 2}))
		})
	}
}

func firstChunkIsAccepted(t *testing.T, h harness) {
	t.Helper()

	result, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 0, ChunkTotal: 2, Bytes: statement(1)[:40],
	})
	if err != nil {
		t.Fatalf("append: %v", err)
	}

	if result.Complete() {
		t.Fatal("the first chunk must not complete the upload")
	}

	if result.Upload.ReceivedChunks != 1 || result.Upload.ChunkTotal != 2 {
		t.Fatalf("progress = %d/%d, want 1/2",
			result.Upload.ReceivedChunks, result.Upload.ChunkTotal)
	}

	if result.Repeated {
		t.Fatal("a fresh chunk is not a replay")
	}
}

func lastChunkAssemblesTheDraft(t *testing.T, h harness) {
	t.Helper()

	body := statement(2)
	split := bytes.Index(body, []byte("2025-02-02"))

	first, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 0, ChunkTotal: 2, Bytes: body[:split],
	})
	if err != nil || first.Complete() {
		t.Fatalf("first chunk: complete=%v err=%v", first.Complete(), err)
	}

	last, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 1, ChunkTotal: 2, Bytes: body[split:],
	})
	if err != nil {
		t.Fatalf("last chunk: %v", err)
	}

	if !last.Complete() || !last.Created {
		t.Fatalf("the last chunk must create the draft: %+v", last)
	}

	if last.Batch.RowsTotal != 2 {
		t.Fatalf("rows total = %d, want 2", last.Batch.RowsTotal)
	}

	if last.Upload.Status != constant.ImportUploadStatusComplete {
		t.Fatalf("upload status = %q, want complete", last.Upload.Status)
	}

	if last.Batch.FileHash == "" {
		t.Fatal("the assembled file must be hashed")
	}
}

func replayedChunkIsANoOp(t *testing.T, h harness) {
	t.Helper()

	chunk := imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 0, ChunkTotal: 2, Bytes: statement(1)[:40],
	}

	first, err := h.service.AppendChunk(t.Context(), chunk)
	if err != nil {
		t.Fatalf("append: %v", err)
	}

	replay, err := h.service.AppendChunk(t.Context(), chunk)
	if err != nil {
		t.Fatalf("replay: %v", err)
	}

	if !replay.Repeated {
		t.Fatal("the second call must report a replay")
	}

	if replay.Upload.ReceivedChunks != first.Upload.ReceivedChunks ||
		replay.Upload.ReceivedBytes != first.Upload.ReceivedBytes {
		t.Fatalf("replay moved the counters: %+v vs %+v", replay.Upload, first.Upload)
	}
}

func anotherChunkTotalIsAConflict(t *testing.T, h harness) {
	t.Helper()

	if _, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 0, ChunkTotal: 2, Bytes: statement(1)[:40],
	}); err != nil {
		t.Fatalf("first chunk: %v", err)
	}

	_, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 1, ChunkTotal: 3, Bytes: []byte("more"),
	})
	if !errors.Is(err, entity.ErrImportChunkConflict) {
		t.Fatalf("error = %v, want ErrImportChunkConflict", err)
	}
}

func aClosedUploadRefusesChunks(t *testing.T, h harness) {
	t.Helper()

	if _, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 0, ChunkTotal: 2, Bytes: statement(1)[:40],
	}); err != nil {
		t.Fatalf("first chunk: %v", err)
	}

	if _, err := h.store.DB().ExecContext(t.Context(),
		`UPDATE import_uploads SET status = ?`,
		constant.ImportUploadStatusAbandoned); err != nil {
		t.Fatalf("abandon: %v", err)
	}

	_, err := h.service.AppendChunk(t.Context(), imports.ChunkInput{
		ClientID: "chunked-1", Filename: "march.csv",
		ChunkIndex: 1, ChunkTotal: 2, Bytes: []byte("more"),
	})
	if !errors.Is(err, entity.ErrImportClosed) {
		t.Fatalf("error = %v, want ErrImportClosed", err)
	}
}

func tooManyRowsIsRefused(t *testing.T, h harness) {
	t.Helper()

	_, _, err := h.service.Create(t.Context(), imports.CreateInput{
		ClientID: "big-1", Filename: "march.csv", FileHash: "abc",
		Statement: statement(3),
	})
	if !errors.Is(err, entity.ErrInvalidImport) {
		t.Fatalf("error = %v, want ErrInvalidImport", err)
	}
}

func TestCommitPostsInChunks(t *testing.T) {
	cases := []struct {
		name       string
		prePosted  int
		wantEvents int
		wantDone   []int
	}{
		{name: "a fresh commit posts three chunks", prePosted: 0, wantEvents: 3, wantDone: []int{500, 1000, 1200}},
		{name: "a resumed commit posts only what is missing", prePosted: 500, wantEvents: 2, wantDone: []int{1000, 1200}},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			assertCommitChunks(t, testCase.prePosted, testCase.wantEvents, testCase.wantDone)
		})
	}
}

func assertCommitChunks(t *testing.T, prePosted, wantEvents int, wantDone []int) {
	t.Helper()

	const rows = 1200

	h := newHarness(t, imports.Options{MaxRows: rows, CommitChunk: 500})
	ctx := t.Context()

	batch, _, err := h.service.Create(ctx, imports.CreateInput{
		ClientID: "big-1", Filename: "march.csv", FileHash: "abc",
		Statement: statement(rows),
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if _, acceptErr := h.store.DB().ExecContext(ctx,
		`UPDATE import_rows SET status = ? WHERE batch_id = ?`,
		constant.ImportRowStatusAccepted, batch.ID); acceptErr != nil {
		t.Fatalf("accept rows: %v", acceptErr)
	}

	prePostRows(t, h, batch, prePosted)

	committed, err := h.service.Review(ctx, batch.Ref, imports.Review{
		Action: constant.ImportActionCommit,
	})
	if err != nil {
		t.Fatalf("commit: %v", err)
	}

	if committed.Status != constant.ImportStatusCommitted {
		t.Fatalf("status = %q, want committed", committed.Status)
	}

	if entries := countEntries(t, h); entries != rows {
		t.Fatalf("ledger holds %d entries, want %d (nothing may post twice)", entries, rows)
	}

	done := commitProgressEvents(t, h, rows)
	if len(done) != wantEvents {
		t.Fatalf("progress events = %v, want %d", done, wantEvents)
	}

	for index, want := range wantDone {
		if done[index] != want {
			t.Fatalf("progress events = %v, want %v", done, wantDone)
		}
	}
}

func TestCommitRefusesARowEdit(t *testing.T) {
	h := newHarness(t, imports.Options{MaxRows: 10, CommitChunk: 1})
	ctx := t.Context()

	batch, _, err := h.service.Create(ctx, imports.CreateInput{
		ClientID: "small-1", Filename: "march.csv", FileHash: "abc", Statement: statement(1),
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if _, parkErr := h.store.BeginImportCommit(ctx, batch.Ref); parkErr != nil {
		t.Fatalf("park mid-commit: %v", parkErr)
	}

	amount := int64(-25000)

	_, err = h.service.PatchRow(ctx, batch.Ref, 0, imports.RowUpdate{AmountMinor: &amount})
	if !errors.Is(err, entity.ErrImportCommitting) {
		t.Fatalf("error = %v, want ErrImportCommitting", err)
	}
}

func prePostRows(t *testing.T, h harness, batch entity.ImportBatch, count int) {
	t.Helper()

	if count == 0 {
		return
	}

	ctx := t.Context()

	if _, err := h.store.BeginImportCommit(ctx, batch.Ref); err != nil {
		t.Fatalf("park mid-commit: %v", err)
	}

	for index := range count {
		if err := postRow(ctx, h, batch, index); err != nil {
			t.Fatalf("pre-post row %d: %v", index, err)
		}
	}
}

func postRow(ctx context.Context, h harness, batch entity.ImportBatch, index int) error {
	amount := int64(1000 + index)

	cash, found, err := h.store.FindAccount(ctx, constant.SeedAssetAccount, constant.AccountKindAsset)
	if err != nil || !found {
		return fmt.Errorf("cash account: found=%v err=%w", found, err)
	}

	unsorted, found, err := h.store.FindAccount(
		ctx, constant.SeedExpenseAccount, constant.AccountKindExpense)
	if err != nil || !found {
		return fmt.Errorf("unsorted account: found=%v err=%w", found, err)
	}

	_, _, err = h.post.Post(ctx, ledger.PostInput{
		ClientID:   fmt.Sprintf("import:%s:%d", batch.FileHash, index),
		OccurredOn: time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC),
		Note:       "resumed row",
		Currency:   "IDR",
		Source:     constant.EntrySourceStatement,
		Postings: []ledger.PostingInput{
			{AccountRef: cash.Ref, AmountMinor: -amount},
			{AccountRef: unsorted.Ref, AmountMinor: amount},
		},
	})

	return err
}

func countEntries(t *testing.T, h harness) int {
	t.Helper()

	var count int

	if err := h.store.DB().QueryRowContext(t.Context(),
		`SELECT COUNT(*) FROM ledger_entries`).Scan(&count); err != nil {
		t.Fatalf("count entries: %v", err)
	}

	return count
}

func commitProgressEvents(t *testing.T, h harness, total int) []int {
	t.Helper()

	rows, err := h.store.DB().QueryContext(t.Context(),
		`SELECT payload_json FROM import_events WHERE kind = ? ORDER BY id`,
		constant.ImportEventCommitting)
	if err != nil {
		t.Fatalf("select progress events: %v", err)
	}

	defer func() { _ = rows.Close() }()

	out := make([]int, 0)

	for rows.Next() {
		var payload string

		if err := rows.Scan(&payload); err != nil {
			t.Fatalf("scan progress event: %v", err)
		}

		var progress struct {
			RowsDone  int `json:"rows_done"`
			RowsTotal int `json:"rows_total"`
		}

		if err := json.Unmarshal([]byte(payload), &progress); err != nil {
			t.Fatalf("decode progress %q: %v", payload, err)
		}

		if progress.RowsTotal != total {
			t.Fatalf("rows_total = %d, want %d", progress.RowsTotal, total)
		}

		out = append(out, progress.RowsDone)
	}

	if err := rows.Err(); err != nil {
		t.Fatalf("iterate progress events: %v", err)
	}

	return out
}
