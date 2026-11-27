package export

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"strconv"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const (
	manifestName    = "manifest.json"
	summaryName     = "summary.json"
	createdAtColumn = "created_at"
)

type sheet struct {
	name   string
	header []string
	rows   [][]string
}

type manifestEntry struct {
	Name   string `json:"name"`
	Rows   int    `json:"rows"`
	SHA256 string `json:"sha256"`
}

type manifestDocument struct {
	SchemaVersion int             `json:"schema_version"`
	ExportedAt    string          `json:"exported_at"`
	Files         []manifestEntry `json:"files"`
}

func encodeZIP(snap *snapshot, out io.Writer) error {
	writer := zip.NewWriter(out)
	manifest := manifestDocument{SchemaVersion: snap.schemaVersion, ExportedAt: stamp(snap.exportedAt)}

	for _, current := range sheets(snap) {
		digest, err := writeSheet(writer, current)
		if err != nil {
			return err
		}

		manifest.Files = append(manifest.Files, manifestEntry{
			Name: current.name, Rows: len(current.rows), SHA256: digest,
		})
	}

	summaryBody, summaryErr := json.Marshal(snap.summarise())
	if summaryErr != nil {
		return fmt.Errorf("summary: %w", summaryErr)
	}

	if err := writeEntry(writer, summaryName, summaryBody); err != nil {
		return err
	}

	manifestBody, err := json.Marshal(manifest)
	if err != nil {
		return fmt.Errorf("manifest: %w", err)
	}

	if err := writeEntry(writer, manifestName, manifestBody); err != nil {
		return err
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("close archive: %w", err)
	}

	return nil
}

func sheets(snap *snapshot) []sheet {
	return []sheet{
		{
			name: "accounts.csv",
			header: []string{
				"ref", "name", "kind", "parent_ref", "currency", "icon", "archived_at", createdAtColumn,
			},
			rows: accountSheet(snap),
		},
		{
			name: "payees.csv",
			header: []string{
				"ref", "name", "default_account_ref", "default_category_ref", "archived_at", createdAtColumn,
			},
			rows: payeeSheet(snap),
		},
		{
			name: "entries.csv",
			header: []string{
				"ref", "occurred_on", "currency", "source", "note", "client_id",
				"payee_ref", "reverses_ref", "voided_at", createdAtColumn,
			},
			rows: entrySheet(snap),
		},
		{
			name: "postings.csv",
			header: []string{
				"entry_ref", "account_ref", "amount_minor", "base_amount_minor",
				"fx_rate", "fx_rate_date", "fx_source",
			},
			rows: postingSheet(snap),
		},
		{
			name: "captures.csv",
			header: []string{
				"ref", "kind", "status", "resolved_entry_ref", "extraction_rail",
				"extraction_model", "received_at", "resolved_at",
			},
			rows: captureSheet(snap),
		},
		{
			name:   "rates.csv",
			header: []string{"ref", "base", "quote", "on_date", "rate", "source", "fetched_at"},
			rows:   rateSheet(snap),
		},
		{
			name: "recurring.csv",
			header: []string{
				"ref", "payee_ref", "account_ref", "category_ref", "amount_minor",
				"currency", "cadence", "interval_n", "day_of_month", "business_day_shift",
				"next_due_on", "ends_on", "origin", "state", "last_posted_on", createdAtColumn,
			},
			rows: recurringSheet(snap),
		},
		{
			name:   "custom_queries.csv",
			header: []string{"ref", "name", "namespace", "chart", createdAtColumn, "updated_at"},
			rows:   customQuerySheet(snap),
		},
		{
			name: "categorization_rules.csv",
			header: []string{
				"ref", "pattern", "field", "match_kind", "account_ref",
				"priority", "archived_at", createdAtColumn,
			},
			rows: categorizationRuleSheet(snap),
		},
	}
}

func accountSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.accounts))

	for _, account := range snap.accounts {
		out = append(out, []string{
			account.Ref,
			account.Name,
			account.Kind,
			account.ParentRef,
			account.Currency,
			account.Icon,
			optionalStamp(account.ArchivedAt),
			stamp(account.CreatedAt),
		})
	}

	return out
}

func payeeSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.payees))

	for _, payee := range snap.payees {
		out = append(out, []string{
			payee.Ref,
			payee.Name,
			payee.DefaultAccountRef,
			payee.DefaultCategoryRef,
			optionalStamp(payee.ArchivedAt),
			stamp(payee.CreatedAt),
		})
	}

	return out
}

func entrySheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.entries))

	for _, entry := range snap.entries {
		out = append(out, []string{
			entry.Ref,
			entry.OccurredOn.Format(constant.DateLayout),
			entry.Currency,
			entry.Source,
			entry.Note,
			entry.ClientID,
			entry.PayeeRef,
			entry.ReversesEntryRef,
			optionalStamp(entry.VoidedAt),
			stamp(entry.CreatedAt),
		})
	}

	return out
}

func postingSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.entries))

	for _, entry := range snap.entries {
		for _, posting := range entry.Postings {
			out = append(out, []string{
				entry.Ref,
				posting.AccountRef,
				strconv.FormatInt(posting.AmountMinor, 10),
				strconv.FormatInt(posting.BaseAmountMinor, 10),
				posting.FXRate,
				posting.FXRateDate,
				posting.FXSource,
			})
		}
	}

	return out
}

func captureSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.captures))

	for _, capture := range snap.captures {
		out = append(out, []string{
			capture.Ref,
			capture.Kind,
			capture.Status,
			capture.ResolvedEntryRef,
			capture.ExtractionRail,
			capture.ExtractionModel,
			stamp(capture.ReceivedAt),
			optionalStamp(capture.ResolvedAt),
		})
	}

	return out
}

func rateSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.rates))

	for _, rate := range snap.rates {
		out = append(out, []string{
			rate.Ref,
			rate.Base,
			rate.Quote,
			rate.OnDate.Format(constant.DateLayout),
			rate.Rate,
			rate.Source,
			stamp(rate.FetchedAt),
		})
	}

	return out
}

func recurringSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.recurring))

	for _, rule := range snap.recurring {
		out = append(out, []string{
			rule.Ref,
			rule.PayeeRef,
			rule.AccountRef,
			rule.CategoryRef,
			strconv.FormatInt(rule.AmountMinor, 10),
			rule.Currency,
			rule.Cadence,
			strconv.Itoa(rule.IntervalN),
			strconv.Itoa(rule.DayOfMonth),
			rule.BusinessDayShift,
			rule.NextDueOn.Format(constant.DateLayout),
			optionalDate(rule.EndsOn),
			rule.Origin,
			rule.State,
			optionalDate(rule.LastPostedOn),
			stamp(rule.CreatedAt),
		})
	}

	return out
}

func customQuerySheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.customQueries))

	for _, query := range snap.customQueries {
		out = append(out, []string{
			query.Ref,
			query.Name,
			query.Namespace,
			query.Chart,
			stamp(query.CreatedAt),
			stamp(query.UpdatedAt),
		})
	}

	return out
}

func writeSheet(writer *zip.Writer, current sheet) (string, error) {
	entry, err := writer.CreateHeader(&zip.FileHeader{Name: current.name, Method: zip.Deflate})
	if err != nil {
		return "", fmt.Errorf("zip entry %s: %w", current.name, err)
	}

	digest := sha256.New()
	csvWriter := csv.NewWriter(io.MultiWriter(entry, digest))

	if err := csvWriter.Write(current.header); err != nil {
		return "", fmt.Errorf("%s header: %w", current.name, err)
	}

	if err := csvWriter.WriteAll(current.rows); err != nil {
		return "", fmt.Errorf("%s rows: %w", current.name, err)
	}

	csvWriter.Flush()

	if err := csvWriter.Error(); err != nil {
		return "", fmt.Errorf("%s: %w", current.name, err)
	}

	return hex.EncodeToString(digest.Sum(nil)), nil
}

func writeEntry(writer *zip.Writer, name string, body []byte) error {
	entry, err := writer.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Deflate})
	if err != nil {
		return fmt.Errorf("zip entry %s: %w", name, err)
	}

	if _, err := entry.Write(body); err != nil {
		return fmt.Errorf("zip write %s: %w", name, err)
	}

	return nil
}

func categorizationRuleSheet(snap *snapshot) [][]string {
	out := make([][]string, 0, len(snap.categorizationRules))

	for _, rule := range snap.categorizationRules {
		out = append(out, []string{
			rule.Ref,
			rule.Pattern,
			rule.Field,
			rule.MatchKind,
			rule.AccountRef,
			strconv.Itoa(rule.Priority),
			optionalStamp(rule.ArchivedAt),
			stamp(rule.CreatedAt),
		})
	}

	return out
}
