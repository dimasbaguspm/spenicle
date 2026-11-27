package export

import (
	"bytes"
	"encoding/json"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type accountRow struct {
	Ref        string `json:"ref"`
	Name       string `json:"name"`
	Kind       string `json:"kind"`
	ParentRef  string `json:"parent_ref,omitempty"`
	Currency   string `json:"currency"`
	Icon       string `json:"icon,omitempty"`
	ArchivedAt string `json:"archived_at,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type payeeRow struct {
	Ref                string `json:"ref"`
	Name               string `json:"name"`
	DefaultAccountRef  string `json:"default_account_ref,omitempty"`
	DefaultCategoryRef string `json:"default_category_ref,omitempty"`
	ArchivedAt         string `json:"archived_at,omitempty"`
	CreatedAt          string `json:"created_at"`
}

type postingRow struct {
	AccountRef      string `json:"account_ref"`
	AmountMinor     string `json:"amount_minor"`
	BaseAmountMinor string `json:"base_amount_minor"`
	FXRate          string `json:"fx_rate"`
	FXRateDate      string `json:"fx_rate_date,omitempty"`
	FXSource        string `json:"fx_source"`
}

type entryRow struct {
	Ref         string       `json:"ref"`
	OccurredOn  string       `json:"occurred_on"`
	Currency    string       `json:"currency"`
	Source      string       `json:"source"`
	Note        string       `json:"note,omitempty"`
	ClientID    string       `json:"client_id,omitempty"`
	PayeeRef    string       `json:"payee_ref,omitempty"`
	ReversesRef string       `json:"reverses_ref,omitempty"`
	VoidedAt    string       `json:"voided_at,omitempty"`
	CreatedAt   string       `json:"created_at"`
	Postings    []postingRow `json:"postings"`
}

type captureRow struct {
	Ref              string `json:"ref"`
	Kind             string `json:"kind"`
	Status           string `json:"status"`
	ResolvedEntryRef string `json:"resolved_entry_ref,omitempty"`
	ExtractionRail   string `json:"extraction_rail,omitempty"`
	ExtractionModel  string `json:"extraction_model,omitempty"`
	ReceivedAt       string `json:"received_at"`
	ResolvedAt       string `json:"resolved_at,omitempty"`
}

type recurringRow struct {
	Ref              string `json:"ref"`
	PayeeRef         string `json:"payee_ref"`
	AccountRef       string `json:"account_ref"`
	CategoryRef      string `json:"category_ref,omitempty"`
	AmountMinor      string `json:"amount_minor"`
	Currency         string `json:"currency"`
	Cadence          string `json:"cadence"`
	IntervalN        int    `json:"interval_n"`
	DayOfMonth       int    `json:"day_of_month,omitempty"`
	BusinessDayShift string `json:"business_day_shift"`
	NextDueOn        string `json:"next_due_on"`
	EndsOn           string `json:"ends_on,omitempty"`
	Origin           string `json:"origin"`
	State            string `json:"state"`
	LastPostedOn     string `json:"last_posted_on,omitempty"`
	CreatedAt        string `json:"created_at"`
}

type rateRow struct {
	Ref       string `json:"ref"`
	Base      string `json:"base"`
	Quote     string `json:"quote"`
	OnDate    string `json:"on_date"`
	Rate      string `json:"rate"`
	Source    string `json:"source"`
	FetchedAt string `json:"fetched_at"`
}

type customQueryRow struct {
	Ref       string `json:"ref"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Chart     string `json:"chart"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type categorizationRuleRow struct {
	Ref        string `json:"ref"`
	Pattern    string `json:"pattern"`
	Field      string `json:"field"`
	MatchKind  string `json:"match_kind"`
	AccountRef string `json:"account_ref"`
	Priority   int    `json:"priority"`
	ArchivedAt string `json:"archived_at,omitempty"`
	CreatedAt  string `json:"created_at"`
}

type documentWriter struct {
	out io.Writer
	err error
}

func encodeJSON(snap *snapshot, out io.Writer) error {
	writer := &documentWriter{out: out}

	writer.raw(`{"schema_version":`)
	writer.value(snap.schemaVersion)
	writer.raw(`,"exported_at":`)
	writer.value(stamp(snap.exportedAt))
	writer.raw(`,"base_currency":`)
	writer.value(snap.baseCurrency)
	writer.raw(`,"summary":`)
	writer.value(snap.summarise())
	writer.raw(`,"data":{`)

	writeArray(writer, true, "accounts", snap.accounts, snap.accountRow)
	writeArray(writer, false, "payees", snap.payees, snap.payeeRow)
	writeArray(writer, false, "entries", snap.entries, snap.entryRow)
	writeArray(writer, false, "captures", snap.captures, snap.captureRow)
	writeArray(writer, false, "recurring", snap.recurring, snap.recurringRow)
	writeArray(writer, false, "rates", snap.rates, snap.rateRow)
	writeArray(writer, false, "custom_queries", snap.customQueries, snap.customQueryRow)
	writeArray(writer, false, "categorization_rules", snap.categorizationRules, snap.categorizationRuleRow)

	writer.raw("}}")

	return writer.err
}

func writeArray[T any](
	writer *documentWriter,
	first bool,
	key string,
	rows []T,
	convert func(T) any,
) {
	if !first {
		writer.raw(",")
	}

	writer.raw(`"` + key + `":[`)

	for index, row := range rows {
		if index > 0 {
			writer.raw(",")
		}

		writer.value(convert(row))
	}

	writer.raw("]")
}

func (d *documentWriter) raw(text string) {
	if d.err != nil {
		return
	}

	_, d.err = io.WriteString(d.out, text)
}

func (d *documentWriter) value(value any) {
	if d.err != nil {
		return
	}

	var buffer bytes.Buffer

	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)

	if d.err = encoder.Encode(value); d.err != nil {
		return
	}

	d.raw(strings.TrimSuffix(buffer.String(), "\n"))
}

func (s *snapshot) accountRow(account entity.Account) any {
	return accountRow{
		Ref:        account.Ref,
		Name:       account.Name,
		Kind:       account.Kind,
		ParentRef:  account.ParentRef,
		Currency:   account.Currency,
		Icon:       account.Icon,
		ArchivedAt: optionalStamp(account.ArchivedAt),
		CreatedAt:  stamp(account.CreatedAt),
	}
}

func (s *snapshot) payeeRow(payee entity.Payee) any {
	return payeeRow{
		Ref:                payee.Ref,
		Name:               payee.Name,
		DefaultAccountRef:  payee.DefaultAccountRef,
		DefaultCategoryRef: payee.DefaultCategoryRef,
		ArchivedAt:         optionalStamp(payee.ArchivedAt),
		CreatedAt:          stamp(payee.CreatedAt),
	}
}

func (s *snapshot) entryRow(entry entity.Entry) any {
	postings := make([]postingRow, 0, len(entry.Postings))

	for _, posting := range entry.Postings {
		postings = append(postings, postingRow{
			AccountRef:      posting.AccountRef,
			AmountMinor:     strconv.FormatInt(posting.AmountMinor, 10),
			BaseAmountMinor: strconv.FormatInt(posting.BaseAmountMinor, 10),
			FXRate:          posting.FXRate,
			FXRateDate:      posting.FXRateDate,
			FXSource:        posting.FXSource,
		})
	}

	return entryRow{
		Ref:         entry.Ref,
		OccurredOn:  entry.OccurredOn.Format(constant.DateLayout),
		Currency:    entry.Currency,
		Source:      entry.Source,
		Note:        entry.Note,
		ClientID:    entry.ClientID,
		PayeeRef:    entry.PayeeRef,
		ReversesRef: entry.ReversesEntryRef,
		VoidedAt:    optionalStamp(entry.VoidedAt),
		CreatedAt:   stamp(entry.CreatedAt),
		Postings:    postings,
	}
}

func (s *snapshot) captureRow(capture entity.Capture) any {
	return captureRow{
		Ref:              capture.Ref,
		Kind:             capture.Kind,
		Status:           capture.Status,
		ResolvedEntryRef: capture.ResolvedEntryRef,
		ExtractionRail:   capture.ExtractionRail,
		ExtractionModel:  capture.ExtractionModel,
		ReceivedAt:       stamp(capture.ReceivedAt),
		ResolvedAt:       optionalStamp(capture.ResolvedAt),
	}
}

func (s *snapshot) recurringRow(rule entity.Recurring) any {
	return recurringRow{
		Ref:              rule.Ref,
		PayeeRef:         rule.PayeeRef,
		AccountRef:       rule.AccountRef,
		CategoryRef:      rule.CategoryRef,
		AmountMinor:      strconv.FormatInt(rule.AmountMinor, 10),
		Currency:         rule.Currency,
		Cadence:          rule.Cadence,
		IntervalN:        rule.IntervalN,
		DayOfMonth:       rule.DayOfMonth,
		BusinessDayShift: rule.BusinessDayShift,
		NextDueOn:        rule.NextDueOn.Format(constant.DateLayout),
		EndsOn:           optionalDate(rule.EndsOn),
		Origin:           rule.Origin,
		State:            rule.State,
		LastPostedOn:     optionalDate(rule.LastPostedOn),
		CreatedAt:        stamp(rule.CreatedAt),
	}
}

func (s *snapshot) rateRow(rate entity.Rate) any {
	return rateRow{
		Ref:       rate.Ref,
		Base:      rate.Base,
		Quote:     rate.Quote,
		OnDate:    rate.OnDate.Format(constant.DateLayout),
		Rate:      rate.Rate,
		Source:    rate.Source,
		FetchedAt: stamp(rate.FetchedAt),
	}
}

func (s *snapshot) customQueryRow(query entity.CustomQuery) any {
	return customQueryRow{
		Ref:       query.Ref,
		Name:      query.Name,
		Namespace: query.Namespace,
		Chart:     query.Chart,
		CreatedAt: stamp(query.CreatedAt),
		UpdatedAt: stamp(query.UpdatedAt),
	}
}

func (s *snapshot) categorizationRuleRow(rule entity.CategorizationRule) any {
	return categorizationRuleRow{
		Ref:        rule.Ref,
		Pattern:    rule.Pattern,
		Field:      rule.Field,
		MatchKind:  rule.MatchKind,
		AccountRef: rule.AccountRef,
		Priority:   rule.Priority,
		ArchivedAt: optionalStamp(rule.ArchivedAt),
		CreatedAt:  stamp(rule.CreatedAt),
	}
}

func stamp(at time.Time) string {
	return at.UTC().Format(constant.TimestampLayout)
}

func optionalStamp(at *time.Time) string {
	if at == nil {
		return ""
	}

	return stamp(*at)
}

func optionalDate(at *time.Time) string {
	if at == nil {
		return ""
	}

	return at.UTC().Format(constant.DateLayout)
}
