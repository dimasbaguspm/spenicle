package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
)

type postingRequest struct {
	AccountID   int64  `json:"account_id"`
	AmountMinor string `json:"amount_minor"`
	FXRate      string `json:"fx_rate,omitempty"`
	FXRateDate  string `json:"fx_rate_date,omitempty"`
}

type postEntryRequest struct {
	ClientID   string           `json:"client_id,omitempty"`
	OccurredOn string           `json:"occurred_on"`
	PayeeID    *int64           `json:"payee_id,omitempty"`
	Note       string           `json:"note,omitempty"`
	Currency   string           `json:"currency"`
	Source     string           `json:"source,omitempty"`
	Postings   []postingRequest `json:"postings"`
}

type postingResponse struct {
	AccountID       int64  `json:"account_id"`
	AmountMinor     string `json:"amount_minor"`
	BaseAmountMinor string `json:"base_amount_minor"`
	FXRate          string `json:"fx_rate"`
	FXSource        string `json:"fx_source"`
}

type entryResponse struct {
	ID         int64             `json:"id"`
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
	Void   bool   `json:"void,omitempty"`
	Reason string `json:"reason,omitempty"`
}

// entryFilterFromRequest reads the listing query, rejecting anything malformed
// before a query is built.
func entryFilterFromRequest(r *http.Request) (entity.EntryFilter, error) {
	filter := entity.EntryFilter{Source: r.URL.Query().Get("source")}

	for name, target := range map[string]*time.Time{"from": &filter.From, "to": &filter.To} {
		value, err := dateParam(r, name)
		if err != nil {
			return entity.EntryFilter{}, err
		}

		*target = value
	}

	accountID, err := int64Param(r, "account_id")
	if err != nil {
		return entity.EntryFilter{}, err
	}

	payeeID, err := int64Param(r, "payee_id")
	if err != nil {
		return entity.EntryFilter{}, err
	}

	cursor, err := int64Param(r, "cursor")
	if err != nil {
		return entity.EntryFilter{}, err
	}

	limit, err := int64Param(r, "limit")
	if err != nil {
		return entity.EntryFilter{}, err
	}

	filter.Cursor = cursor
	filter.Limit = int(limit)

	if accountID > 0 {
		filter.AccountID = &accountID
	}

	if payeeID > 0 {
		filter.PayeeID = &payeeID
	}

	return filter, nil
}

// handleListEntries answers the ledger listing: newest first, filters optional.
func (s *server) handleListEntries(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.List")
	defer endSpan()

	filter, err := entryFilterFromRequest(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_filter", err.Error())

		return
	}

	entries, err := s.deps.Ledger.List(ctx, filter)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out := entryListResponse{Entries: make([]entryResponse, 0, len(entries))}
	for _, entry := range entries {
		out.Entries = append(out.Entries, toEntryResponse(entry))
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

// handlePatchEntry voids an entry. Field edits are a later slice and answer 422
// rather than pretending to work.
func (s *server) handlePatchEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Patch")
	defer endSpan()

	id, err := pathID(r)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_id", err.Error())

		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	var request entryPatchRequest

	if err = json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_json", err.Error())

		return
	}

	if !request.Void {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "unsupported_patch",
			"only {\"void\": true} is supported today")

		return
	}

	reversal, err := s.deps.Ledger.Void(ctx, id, request.Reason)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toEntryResponse(reversal))
}

func (s *server) handlePostEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Post")
	defer endSpan()

	r.Body = http.MaxBytesReader(w, r.Body, s.deps.MaxBodyBytes)

	var request postEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_json", err.Error())

		return
	}

	input, err := toPostInput(request)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	entry, created, err := s.deps.Ledger.Post(ctx, input)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	// A replayed client id returns the stored entry untouched: 200, not 201.
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}

	httpx.WriteJSON(w, status, toEntryResponse(entry))
}

func toPostInput(request postEntryRequest) (ledger.PostInput, error) {
	occurredOn, err := time.Parse(constant.DateLayout, strings.TrimSpace(request.OccurredOn))
	if err != nil {
		return ledger.PostInput{}, errors.New("occurred_on must be YYYY-MM-DD")
	}

	postings := make([]ledger.PostingInput, 0, len(request.Postings))

	for _, posting := range request.Postings {
		amount, err := strconv.ParseInt(strings.TrimSpace(posting.AmountMinor), 10, 64)
		if err != nil {
			return ledger.PostInput{}, errors.New("amount_minor must be an integer string")
		}

		postings = append(postings, ledger.PostingInput{
			AccountID:   posting.AccountID,
			AmountMinor: amount,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return ledger.PostInput{
		ClientID:   request.ClientID,
		OccurredOn: occurredOn,
		PayeeID:    request.PayeeID,
		Note:       request.Note,
		Currency:   request.Currency,
		Source:     request.Source,
		Postings:   postings,
	}, nil
}

func toEntryResponse(entry entity.Entry) entryResponse {
	out := entryResponse{
		ID:         entry.ID,
		OccurredOn: entry.OccurredOn.Format(constant.DateLayout),
		Currency:   entry.Currency,
		Source:     entry.Source,
		Note:       entry.Note,
	}

	for _, posting := range entry.Postings {
		out.Postings = append(out.Postings, postingResponse{
			AccountID:       posting.AccountID,
			AmountMinor:     strconv.FormatInt(posting.AmountMinor, 10),
			BaseAmountMinor: strconv.FormatInt(posting.BaseAmountMinor, 10),
			FXRate:          posting.FXRate,
			FXSource:        posting.FXSource,
		})
	}

	return out
}

// classify maps domain errors onto HTTP without leaking internals.
func classify(err error) (int, string) {
	switch {
	case errors.Is(err, entity.ErrZeroSum):
		return http.StatusUnprocessableEntity, "postings_not_balanced"
	case errors.Is(err, entity.ErrInvalidPostings):
		return http.StatusUnprocessableEntity, "invalid_postings"
	case errors.Is(err, entity.ErrUnknownCurrency):
		return http.StatusUnprocessableEntity, "unknown_currency"
	case errors.Is(err, entity.ErrInvalidRate), errors.Is(err, entity.ErrInvalidAmount):
		return http.StatusUnprocessableEntity, "invalid_rate"
	case errors.Is(err, entity.ErrSecretMismatch):
		return http.StatusConflict, "secret_mismatch"
	case errors.Is(err, entity.ErrNotFound):
		return http.StatusNotFound, "not_found"
	case errors.Is(err, entity.ErrUnknownCaptureKind):
		return http.StatusUnprocessableEntity, "unknown_capture_kind"
	case errors.Is(err, entity.ErrCaptureResolved):
		return http.StatusConflict, "capture_resolved"
	case errors.Is(err, entity.ErrInvalidState):
		return http.StatusConflict, "invalid_state"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}
