package export

import (
	"bytes"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
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
	refA = "00000000000000000000000000000001"
	refB = "00000000000000000000000000000002"
	refC = "00000000000000000000000000000003"
	refD = "00000000000000000000000000000004"
)
