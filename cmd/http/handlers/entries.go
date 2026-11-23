package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
)

type postingRequest struct {
	AccountRef  string `json:"account_ref"            validate:"required,ref"`
	AmountMinor string `json:"amount_minor"           validate:"required,money"`
	FXRate      string `json:"fx_rate,omitempty"      validate:"omitempty,rate"`
	FXRateDate  string `json:"fx_rate_date,omitempty" validate:"omitempty,datestr"`
}

type postEntryRequest struct {
	ClientID   string           `json:"client_id,omitempty" validate:"omitempty,max=64"`
	OccurredOn string           `json:"occurred_on"         validate:"required,datestr"`
	Note       string           `json:"note,omitempty"      validate:"max=2000"`
	Currency   string           `json:"currency"            validate:"required,currency"`
	Source     string           `json:"source,omitempty"    validate:"omitempty,source"`
	Postings   []postingRequest `json:"postings"            validate:"required,min=2,dive"`
}

type entryListQuery struct {
	From       string `query:"from"        validate:"omitempty,datestr"`
	To         string `query:"to"          validate:"omitempty,datestr"`
	AccountRef string `query:"account_ref" validate:"omitempty,ref"`
	Source     string `query:"source"      validate:"omitempty,source"`
	Cursor     int64  `query:"cursor"      validate:"omitempty,gte=0"`
	Limit      int64  `query:"limit"       validate:"omitempty,gte=0,lte=200"`
}

type postingResponse struct {
	AccountRef      string `json:"account_ref"`
	AmountMinor     string `json:"amount_minor"`
	BaseAmountMinor string `json:"base_amount_minor"`
	FXRate          string `json:"fx_rate"`
	FXSource        string `json:"fx_source"`
}

type entryResponse struct {
	Ref        string            `json:"ref"`
	OccurredOn string            `json:"occurred_on"`
	Currency   string            `json:"currency"`
	Source     string            `json:"source"`
	Note       string            `json:"note,omitempty"`
	Postings   []postingResponse `json:"postings"`
}

type entryListResponse struct {
	Entries    []entryResponse `json:"entries"`
	NextCursor int64           `json:"next_cursor,omitempty"`
}

type entryPatchRequest struct {
	Void   bool   `json:"void"             validate:"required"`
	Reason string `json:"reason,omitempty" validate:"max=2000"`
}

func entryFilterFromRequest(r *http.Request) (entity.EntryFilter, error) {
	var query entryListQuery

	if err := bindQuery(r, &query); err != nil {
		return entity.EntryFilter{}, err
	}

	filter := entity.EntryFilter{Source: query.Source, Cursor: query.Cursor, Limit: int(query.Limit)}

	for raw, target := range map[string]*time.Time{"from": &filter.From, "to": &filter.To} {
		value := query.From
		if raw == "to" {
			value = query.To
		}

		if value == "" {
			continue
		}

		parsed, err := time.Parse(constant.DateLayout, value)
		if err != nil {
			return entity.EntryFilter{}, fmt.Errorf("parse %s: %w", raw, err)
		}

		*target = parsed
	}

	filter.AccountRef = query.AccountRef

	return filter, nil
}

func (s *server) handleListEntries(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.List")
	defer endSpan()

	filter, err := entryFilterFromRequest(r)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	entries, err := s.deps.Ledger.List(ctx, filter)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out := entryListResponse{Entries: make([]entryResponse, 0, len(entries))}
	for _, entry := range entries {
		out.Entries = append(out.Entries, toEntryResponse(entry))
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func (s *server) handlePatchEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request entryPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	if !request.Void {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "unsupported_patch",
			"only {\"void\": true} is supported today")

		return
	}

	reversal, err := s.deps.Ledger.Void(ctx, path.Ref, request.Reason)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toEntryResponse(reversal))
}

func (s *server) handlePostEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Post")
	defer endSpan()

	var request postEntryRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	input, err := toPostInput(request)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	entry, created, err := s.deps.Ledger.Post(ctx, input)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}

	httpx.WriteJSON(w, status, toEntryResponse(entry))
}

func toPostInput(request postEntryRequest) (ledger.PostInput, error) {
	occurredOn, err := time.Parse(constant.DateLayout, request.OccurredOn)
	if err != nil {
		return ledger.PostInput{}, fmt.Errorf("parse occurred_on: %w", err)
	}

	postings := make([]ledger.PostingInput, 0, len(request.Postings))

	for _, posting := range request.Postings {
		amount, err := strconv.ParseInt(posting.AmountMinor, 10, 64)
		if err != nil {
			return ledger.PostInput{}, fmt.Errorf("parse amount_minor: %w", err)
		}

		postings = append(postings, ledger.PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: amount,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return ledger.PostInput{
		ClientID:   request.ClientID,
		OccurredOn: occurredOn,
		Note:       request.Note,
		Currency:   request.Currency,
		Source:     request.Source,
		Postings:   postings,
	}, nil
}

func toEntryResponse(entry entity.Entry) entryResponse {
	out := entryResponse{
		Ref:        entry.Ref,
		OccurredOn: entry.OccurredOn.Format(constant.DateLayout),
		Currency:   entry.Currency,
		Source:     entry.Source,
		Note:       entry.Note,
	}

	for _, posting := range entry.Postings {
		out.Postings = append(out.Postings, postingResponse{
			AccountRef:      posting.AccountRef,
			AmountMinor:     strconv.FormatInt(posting.AmountMinor, 10),
			BaseAmountMinor: strconv.FormatInt(posting.BaseAmountMinor, 10),
			FXRate:          posting.FXRate,
			FXSource:        posting.FXSource,
		})
	}

	return out
}

func classify(err error) (int, string) {
	for _, mapping := range errorMappings {
		if errors.Is(err, mapping.err) {
			return mapping.status, mapping.code
		}
	}

	return http.StatusInternalServerError, "internal_error"
}

type errorMapping struct {
	err    error
	status int
	code   string
}

var errorMappings = []errorMapping{ //nolint:gochecknoglobals // read-only table
	{entity.ErrZeroSum, http.StatusUnprocessableEntity, "postings_not_balanced"},
	{entity.ErrInvalidPostings, http.StatusUnprocessableEntity, "invalid_postings"},
	{entity.ErrUnknownCurrency, http.StatusUnprocessableEntity, "unknown_currency"},
	{entity.ErrInvalidRate, http.StatusUnprocessableEntity, "invalid_rate"},
	{entity.ErrInvalidAmount, http.StatusUnprocessableEntity, "invalid_rate"},
	{entity.ErrSecretMismatch, http.StatusConflict, "secret_mismatch"},
	{entity.ErrNotFound, http.StatusNotFound, "not_found"},
	{entity.ErrUnknownCaptureKind, http.StatusUnprocessableEntity, "unknown_capture_kind"},
	{entity.ErrCaptureResolved, http.StatusConflict, "capture_resolved"},
	{entity.ErrInvalidState, http.StatusConflict, "invalid_state"},
	{entity.ErrPasswordMismatch, http.StatusUnauthorized, "invalid_password"},
	{entity.ErrWeakPassword, http.StatusUnprocessableEntity, "weak_password"},
	{entity.ErrBaseCurrencyLocked, http.StatusConflict, "base_currency_locked"},
}
