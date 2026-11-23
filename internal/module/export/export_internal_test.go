package export

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
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

	firstJSON := encodeDocument(t, first)
	secondJSON := encodeDocument(t, second)

	if !bytes.Equal(firstJSON, secondJSON) {
		t.Fatalf("JSON document differs\n--- first\n%s\n--- second\n%s", firstJSON, secondJSON)
	}

	firstZIP, err := encodeZIP(first)
	if err != nil {
		t.Fatalf("encode zip: %v", err)
	}

	secondZIP, err := encodeZIP(second)
	if err != nil {
		t.Fatalf("encode zip: %v", err)
	}

	if !bytes.Equal(firstZIP, secondZIP) {
		t.Fatal("the two archives differ for the same data")
	}
}

func TestJSONEnvelopeKeepsItsKeyOrder(t *testing.T) {
	t.Parallel()

	snap := fixedSnapshot(time.Date(2026, time.January, 2, 3, 4, 5, 0, time.UTC))
	snap.sort()

	document := encodeDocument(t, snap)

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
		BaseCurrency:  "IDR",
	}

	t.Run("json", func(t *testing.T) {
		document := exportedJSON(t, deps)

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
		counts := manifestRows(t, exportedArchive(t, deps))

		for _, name := range []string{"accounts.csv", "payees.csv", "captures.csv", "recurring.csv"} {
			if counts[name] != exportedRows {
				t.Fatalf("%s carries %d rows, want %d", name, counts[name], exportedRows)
			}
		}
	})
}

func exportedJSON(t *testing.T, deps Deps) []byte {
	t.Helper()

	document, err := Render(t.Context(), deps, constant.ExportFormatJSON)
	if err != nil {
		t.Fatalf("json export: %v", err)
	}

	return document.Bytes
}

func exportedArchive(t *testing.T, deps Deps) []byte {
	t.Helper()

	document, err := Render(t.Context(), deps, constant.ExportFormatCSV)
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

func encodeDocument(t *testing.T, snap *snapshot) []byte {
	t.Helper()

	var out bytes.Buffer

	if err := encodeJSON(snap, &out); err != nil {
		t.Fatalf("encode json: %v", err)
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

const (
	exportedRows = 250

	refA = "00000000000000000000000000000001"
	refB = "00000000000000000000000000000002"
	refC = "00000000000000000000000000000003"
	refD = "00000000000000000000000000000004"
)
