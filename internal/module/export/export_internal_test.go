package export

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/settings"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

func TestEncodedExportIsByteIdenticalForTheSameData(t *testing.T) {
	t.Parallel()

	at := time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)

	first := fixedSnapshot(at)
	first.sort()

	second := fixedSnapshot(at)
	second.accounts[0], second.accounts[1] = second.accounts[1], second.accounts[0]
	second.sort()

	firstJSON := encodedJSON(t, first)
	secondJSON := encodedJSON(t, second)

	if !bytes.Equal(firstJSON, secondJSON) {
		t.Fatalf("JSON document differs\n--- first\n%s\n--- second\n%s", firstJSON, secondJSON)
	}

	firstZIP := encodedZIP(t, first)
	secondZIP := encodedZIP(t, second)

	if !bytes.Equal(firstZIP, secondZIP) {
		t.Fatal("the two archives differ for the same data")
	}
}

type renderedFileCase struct {
	name        string
	format      string
	contentType string
	extension   string
}

func assertRenderedFile(t *testing.T, want renderedFileCase, dir string, document Document, file FileDocument) {
	t.Helper()

	body, err := os.ReadFile(file.Path)
	if err != nil {
		t.Fatalf("read rendered file: %v", err)
	}

	if !bytes.Equal(body, document.Bytes) {
		t.Fatalf("the file and in-memory documents differ for %s", want.format)
	}

	if file.ContentType != want.contentType || file.Extension != want.extension {
		t.Fatalf("metadata = %q/%q, want %q/%q",
			file.ContentType, file.Extension, want.contentType, want.extension)
	}

	if !maps.Equal(file.Counts, document.Counts) {
		t.Fatalf("counts = %v, want %v", file.Counts, document.Counts)
	}

	if got := filepath.Dir(file.Path); got != dir {
		t.Fatalf("temporary file is in %q, want %q", got, dir)
	}

	if err := os.Remove(file.Path); err != nil {
		t.Fatalf("remove temporary file: %v", err)
	}
}

func TestRenderFileMatchesTheInMemoryDocument(t *testing.T) {
	t.Parallel()

	deps := windowedDeps(t)

	tests := []renderedFileCase{
		{
			name:        "json",
			format:      constant.ExportFormatJSON,
			contentType: "application/json",
			extension:   "json",
		},
		{
			name:        "csv",
			format:      constant.ExportFormatCSV,
			contentType: "application/zip",
			extension:   "zip",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			document, err := Render(t.Context(), deps, tc.format, nil)
			if err != nil {
				t.Fatalf("render in memory: %v", err)
			}

			file, err := RenderFile(t.Context(), deps, tc.format, nil, dir)
			if err != nil {
				t.Fatalf("render to file: %v", err)
			}

			assertRenderedFile(t, tc, dir, document, file)
		})
	}
}

func TestRenderFileRefusesAnUnknownFormatWithoutWritingAFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	if _, err := RenderFile(t.Context(), windowedDeps(t), "xml", nil, dir); err == nil {
		t.Fatal("an unknown format rendered a file")
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read temp dir: %v", err)
	}

	if len(entries) != 0 {
		t.Fatalf("an unknown format left %d files behind", len(entries))
	}
}

func TestCollectIgnoresTheClockWhenStampingTheDocument(t *testing.T) {
	t.Parallel()

	base := windowedDeps(t)

	tests := []struct {
		name   string
		render func(*testing.T, Deps) []byte
	}{
		{
			name: "json",
			render: func(t *testing.T, deps Deps) []byte {
				t.Helper()

				return exportedJSON(t, deps, nil)
			},
		},
		{
			name: "zip",
			render: func(t *testing.T, deps Deps) []byte {
				t.Helper()

				return exportedArchive(t, deps, nil)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			first := base
			first.Clock = fixedClock{at: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)}

			second := base
			second.Clock = fixedClock{at: time.Date(2030, time.June, 7, 8, 9, 10, 0, time.UTC)}

			if got, want := tc.render(t, first), tc.render(t, second); !bytes.Equal(got, want) {
				t.Fatalf("the two documents differ when only the clock changes")
			}
		})
	}
}

func TestJSONEnvelopeKeepsItsKeyOrder(t *testing.T) {
	t.Parallel()

	snap := fixedSnapshot(time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC))
	snap.sort()

	document := encodedJSON(t, snap)

	envelope := `{"schema_version":2,"exported_at":"2026-01-02T03:04:05Z","base_currency":"IDR",`
	if !bytes.HasPrefix(document, []byte(envelope)) {
		t.Fatalf("document starts with %s, want %s", preview(document), envelope)
	}

	if bytes.Contains(document, []byte(`"id":`)) {
		t.Fatalf("an integer id leaked into the document: %s", preview(document))
	}

	if bytes.Contains(document, []byte(`v1:`)) {
		t.Fatalf("a sealed value leaked into the document: %s", preview(document))
	}
}

func TestExportCarriesEveryRowPastOnePage(t *testing.T) {
	t.Parallel()

	store := exportedStore(t)

	deps := Deps{
		Ledger:        store,
		Exporter:      store,
		CustomQueries: store,
		Rates:         store,
		System:        store,
		Clock:         fixedClock{at: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)},
		Settings:      settings.New(store, nil, fixedClock{at: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)}),
	}

	t.Run("json", func(t *testing.T) {
		document := exportedJSON(t, deps, nil)

		var decoded struct {
			Data struct {
				Accounts  []json.RawMessage `json:"accounts"`
				Payees    []json.RawMessage `json:"payees"`
				Captures  []json.RawMessage `json:"captures"`
				Recurring []json.RawMessage `json:"recurring"`
			} `json:"data"`
			Summary struct {
				Counts map[string]int `json:"counts"`
			} `json:"summary"`
		}

		if err := json.Unmarshal(document, &decoded); err != nil {
			t.Fatalf("decode export: %v", err)
		}

		counts := map[string]int{
			"accounts":  len(decoded.Data.Accounts),
			"payees":    len(decoded.Data.Payees),
			"captures":  len(decoded.Data.Captures),
			"recurring": len(decoded.Data.Recurring),
		}

		for name, rows := range counts {
			if rows != exportedRows {
				t.Fatalf("%s carries %d rows, want %d", name, rows, exportedRows)
			}

			if decoded.Summary.Counts[name] != exportedRows {
				t.Fatalf("the summary counts %d %s rows, want %d",
					decoded.Summary.Counts[name], name, exportedRows)
			}
		}
	})

	t.Run("csv", func(t *testing.T) {
		counts := manifestRows(t, exportedArchive(t, deps, nil))

		for _, name := range []string{"accounts.csv", "payees.csv", "captures.csv", "recurring.csv"} {
			if counts[name] != exportedRows {
				t.Fatalf("%s carries %d rows, want %d", name, counts[name], exportedRows)
			}
		}
	})
}

func exportedJSON(t *testing.T, deps Deps, window *Window) []byte {
	t.Helper()

	document, err := Render(t.Context(), deps, constant.ExportFormatJSON, window)
	if err != nil {
		t.Fatalf("json export: %v", err)
	}

	return document.Bytes
}

func exportedArchive(t *testing.T, deps Deps, window *Window) []byte {
	t.Helper()

	document, err := Render(t.Context(), deps, constant.ExportFormatCSV, window)
	if err != nil {
		t.Fatalf("csv export: %v", err)
	}

	return document.Bytes
}

func manifestRows(t *testing.T, archive []byte) map[string]int {
	t.Helper()

	reader, err := zip.NewReader(bytes.NewReader(archive), int64(len(archive)))
	if err != nil {
		t.Fatalf("read archive: %v", err)
	}

	for _, file := range reader.File {
		if file.Name != manifestName {
			continue
		}

		body, err := file.Open()
		if err != nil {
			t.Fatalf("open manifest: %v", err)
		}

		payload, err := io.ReadAll(body)
		_ = body.Close()

		if err != nil {
			t.Fatalf("read manifest: %v", err)
		}

		var manifest manifestDocument
		if err := json.Unmarshal(payload, &manifest); err != nil {
			t.Fatalf("decode manifest: %v", err)
		}

		counts := make(map[string]int, len(manifest.Files))

		for _, entry := range manifest.Files {
			counts[entry.Name] = entry.Rows
		}

		return counts
	}

	t.Fatal("the archive carries no manifest.json")

	return nil
}

func exportedStore(t *testing.T) *sqlite.Store {
	t.Helper()

	ctx := t.Context()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "export.db")})
	if err != nil {
		t.Fatalf("open store: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if err := sqlite.Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	store := sqlite.NewStore(db)

	seedExportedRows(t, store)

	return store
}

func seedExportedRows(t *testing.T, store *sqlite.Store) {
	t.Helper()

	ctx := t.Context()
	start := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)

	accounts := make([]entity.Account, 0, exportedRows)

	for i := range exportedRows {
		account, err := store.CreateAccount(ctx, fmt.Sprintf("Account %03d", i), "expense", "IDR")
		if err != nil {
			t.Fatalf("create account %d: %v", i, err)
		}

		accounts = append(accounts, account)
	}

	payees := make([]entity.Payee, 0, exportedRows)

	for i := range exportedRows {
		payee, err := store.CreatePayee(ctx, entity.Payee{Name: fmt.Sprintf("Payee %03d", i)})
		if err != nil {
			t.Fatalf("create payee %d: %v", i, err)
		}

		payees = append(payees, payee)
	}

	for i := range exportedRows {
		if _, err := store.InsertCapture(ctx, entity.Capture{
			Kind:       constant.CaptureKindShare,
			Status:     constant.CaptureStatusPending,
			DedupeKey:  fmt.Sprintf("dedupe-%03d", i),
			ReceivedAt: start.Add(time.Duration(i) * time.Minute),
		}); err != nil {
			t.Fatalf("insert capture %d: %v", i, err)
		}
	}

	for i := range exportedRows {
		if _, err := store.CreateRecurring(ctx, entity.Recurring{
			PayeeRef:         payees[i].Ref,
			AccountRef:       accounts[i].Ref,
			AmountMinor:      int64(1_000 + i),
			Currency:         "IDR",
			Cadence:          constant.RecurringCadenceMonthly,
			IntervalN:        1,
			NextDueOn:        start.AddDate(0, 0, i),
			BusinessDayShift: constant.ShiftNone,
			State:            constant.RecurringStateActive,
		}); err != nil {
			t.Fatalf("create recurring %d: %v", i, err)
		}
	}
}

type fixedClock struct{ at time.Time }

func (c fixedClock) Now() time.Time { return c.at }

func encodedJSON(t *testing.T, snap *snapshot) []byte {
	t.Helper()

	var out bytes.Buffer

	if err := encodeJSON(snap, &out); err != nil {
		t.Fatalf("encode json: %v", err)
	}

	return out.Bytes()
}

func encodedZIP(t *testing.T, snap *snapshot) []byte {
	t.Helper()

	var out bytes.Buffer

	if err := encodeZIP(snap, &out); err != nil {
		t.Fatalf("encode zip: %v", err)
	}

	return out.Bytes()
}

func preview(document []byte) string {
	const window = 180

	if len(document) > window {
		return string(document[:window]) + "..."
	}

	return string(document)
}

func fixedSnapshot(at time.Time) *snapshot {
	return &snapshot{
		schemaVersion: 2,
		exportedAt:    at,
		baseCurrency:  "IDR",
		accounts: []entity.Account{
			{ID: 2, Ref: refB, Name: "Unsorted", Kind: "expense", Currency: "IDR", CreatedAt: at},
			{ID: 1, Ref: refA, Name: "Cash", Kind: "asset", Currency: "IDR", CreatedAt: at},
		},
		entries: []entity.Entry{
			{
				ID: 1, Ref: refC, OccurredOn: at, Currency: "IDR", Source: "manual",
				PayeeID: ptr(int64(1)), CreatedAt: at,
				Postings: []entity.Posting{
					{
						AccountID: 2, AccountRef: refB, AmountMinor: 25000, BaseAmountMinor: 25000,
						FXRate: "1", FXSource: "identity",
					},
					{
						AccountID: 1, AccountRef: refA, AmountMinor: -25000, BaseAmountMinor: -25000,
						FXRate: "1", FXSource: "identity",
					},
				},
			},
		},
		payees: []entity.Payee{{ID: 1, Ref: refD, Name: "Kopi", CreatedAt: at}},
	}
}

func ptr(value int64) *int64 {
	return &value
}

func TestWindowedExportFollowsTheWindow(t *testing.T) {
	t.Parallel()

	deps := windowedDeps(t)

	tests := []struct {
		name           string
		window         *Window
		wantMonths     []string
		wantEntries    int
		wantPostings   int
		wantCategories int
	}{
		{
			name:           "no window carries every entry",
			wantMonths:     []string{"2024-06", "2025-06"},
			wantEntries:    2,
			wantPostings:   4,
			wantCategories: 1,
		},
		{
			name:           "an in-window entry is kept",
			window:         &Window{From: day(2025, time.January, 1), To: day(2025, time.December, 31)},
			wantMonths:     []string{"2025-06"},
			wantEntries:    1,
			wantPostings:   2,
			wantCategories: 1,
		},
		{
			name:           "an out-of-window entry is dropped",
			window:         &Window{From: day(2024, time.January, 1), To: day(2024, time.December, 31)},
			wantMonths:     []string{"2024-06"},
			wantEntries:    1,
			wantPostings:   2,
			wantCategories: 1,
		},
		{
			name:           "a window that matches nothing renders empty arrays",
			window:         &Window{From: day(2030, time.January, 1), To: day(2030, time.December, 31)},
			wantMonths:     []string{},
			wantEntries:    0,
			wantPostings:   0,
			wantCategories: 0,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assertWindowedDocument(t, deps, test.window,
				test.wantEntries, test.wantPostings, test.wantCategories)
			assertWindowedMonths(t, deps, test.window, test.wantMonths)
			assertWindowedSheets(t, deps, test.window, test.wantEntries, test.wantPostings)
		})
	}
}

const (
	exportedRows = 250

	refA = "00000000000000000000000000000001"
	refB = "00000000000000000000000000000002"
	refC = "00000000000000000000000000000003"
	refD = "00000000000000000000000000000004"
)

func windowedDeps(t *testing.T) Deps {
	t.Helper()

	ctx := t.Context()

	db, err := sqlite.Open(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "window.db")})
	if err != nil {
		t.Fatalf("open store: %v", err)
	}

	t.Cleanup(func() { _ = db.Close() })

	if migrateErr := sqlite.Migrate(ctx, db); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	store := sqlite.NewStore(db)

	cash, err := store.CreateAccount(ctx, "Cash", "asset", "IDR")
	if err != nil {
		t.Fatalf("create asset: %v", err)
	}

	expense, err := store.CreateAccount(ctx, "Unsorted", "expense", "IDR")
	if err != nil {
		t.Fatalf("create expense: %v", err)
	}

	spends := []struct {
		day    time.Time
		amount int64
	}{
		{day: day(2024, time.June, 15), amount: 40_000},
		{day: day(2025, time.June, 15), amount: 25_000},
	}

	for _, spend := range spends {
		entry, entryErr := entity.NewEntry(entity.Entry{
			OccurredOn: spend.day,
			Currency:   "IDR",
			Postings: []entity.Posting{
				{AccountID: expense.ID, AmountMinor: spend.amount, BaseAmountMinor: spend.amount},
				{AccountID: cash.ID, AmountMinor: -spend.amount, BaseAmountMinor: -spend.amount},
			},
		})
		if entryErr != nil {
			t.Fatalf("new entry: %v", entryErr)
		}

		if _, entryErr = store.InsertEntry(ctx, entry); entryErr != nil {
			t.Fatalf("insert entry: %v", entryErr)
		}
	}

	return Deps{
		Ledger:        store,
		Exporter:      store,
		CustomQueries: store,
		Rates:         store,
		System:        store,
		Clock:         fixedClock{at: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)},
		Settings:      settings.New(store, nil, fixedClock{at: time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC)}),
	}
}

type windowedDocument struct {
	Data struct {
		Entries []json.RawMessage `json:"entries"`
	} `json:"data"`
	Summary struct {
		Months []struct {
			Month string `json:"month"`
		} `json:"months"`
		Categories []json.RawMessage `json:"categories"`
		Counts     map[string]int    `json:"counts"`
		Window     *struct {
			From string `json:"from"`
			To   string `json:"to"`
		} `json:"window"`
	} `json:"summary"`
}

func windowedExport(t *testing.T, deps Deps, window *Window) windowedDocument {
	t.Helper()

	var decoded windowedDocument
	if err := json.Unmarshal(exportedJSON(t, deps, window), &decoded); err != nil {
		t.Fatalf("decode export: %v", err)
	}

	return decoded
}

func assertWindowedDocument(
	t *testing.T,
	deps Deps,
	window *Window,
	entries, postings, categories int,
) {
	t.Helper()

	decoded := windowedExport(t, deps, window)

	if len(decoded.Data.Entries) != entries {
		t.Fatalf("the document carries %d entries, want %d", len(decoded.Data.Entries), entries)
	}

	counts := map[string]int{"entries": entries, "postings": postings, "accounts": 2}

	for name, want := range counts {
		if decoded.Summary.Counts[name] != want {
			t.Fatalf("the summary counts %d %s, want %d", decoded.Summary.Counts[name], name, want)
		}
	}

	if len(decoded.Summary.Categories) != categories {
		t.Fatalf("the summary carries %d categories, want %d",
			len(decoded.Summary.Categories), categories)
	}

	if window == nil {
		if decoded.Summary.Window != nil {
			t.Fatalf("an unwindowed summary carries a window: %+v", decoded.Summary.Window)
		}

		return
	}

	if decoded.Summary.Window == nil {
		t.Fatal("the summary carries no window")
	}

	wantFrom := window.From.Format(constant.DateLayout)
	wantTo := window.To.Format(constant.DateLayout)

	if decoded.Summary.Window.From != wantFrom || decoded.Summary.Window.To != wantTo {
		t.Fatalf("the summary window is %s..%s, want %s..%s",
			decoded.Summary.Window.From, decoded.Summary.Window.To, wantFrom, wantTo)
	}
}

func assertWindowedMonths(t *testing.T, deps Deps, window *Window, want []string) {
	t.Helper()

	decoded := windowedExport(t, deps, window)

	got := make([]string, 0, len(decoded.Summary.Months))
	for _, month := range decoded.Summary.Months {
		got = append(got, month.Month)
	}

	if !slices.Equal(got, want) {
		t.Fatalf("the summary months are %v, want %v", got, want)
	}
}

func assertWindowedSheets(t *testing.T, deps Deps, window *Window, entries, postings int) {
	t.Helper()

	counts := manifestRows(t, exportedArchive(t, deps, window))

	if counts["entries.csv"] != entries {
		t.Fatalf("entries.csv carries %d rows, want %d", counts["entries.csv"], entries)
	}

	if counts["postings.csv"] != postings {
		t.Fatalf("postings.csv carries %d rows, want %d", counts["postings.csv"], postings)
	}
}

func day(year int, month time.Month, dayOfMonth int) time.Time {
	return time.Date(year, month, dayOfMonth, 0, 0, 0, 0, time.UTC)
}
