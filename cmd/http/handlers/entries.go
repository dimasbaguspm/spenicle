package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/idem"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/connections"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
)

type postingRequest struct {
	AccountRef  string `json:"account_ref"            validate:"required,ref"`
	AmountMinor string `json:"amount_minor"           validate:"required,money"`
	FXRate      string `json:"fx_rate,omitempty"      validate:"omitempty,rate"`
	FXRateDate  string `json:"fx_rate_date,omitempty" validate:"omitempty,datestr"`
}

type postEntryRequest struct {
	IdempotencyKey string           `json:"idempotency_key,omitempty" validate:"omitempty,max=64"`
	OccurredOn     string           `json:"occurred_on"               validate:"required,datestr"`
	PayeeRef       string           `json:"payee_ref,omitempty"       validate:"omitempty,ref"`
	Note           string           `json:"note,omitempty"            validate:"max=2000"`
	Currency       string           `json:"currency"                  validate:"required,currency"`
	Source         string           `json:"source,omitempty"          validate:"omitempty,source"`
	Postings       []postingRequest `json:"postings"                  validate:"required,min=2,dive"`
}

type accountSummary struct {
	Ref  string `json:"ref"`
	Name string `json:"name"`
	Kind string `json:"kind"`
}

type payeeSummary struct {
	Ref  string `json:"ref"`
	Name string `json:"name"`
}

type postingResponse struct {
	Account         accountSummary `json:"account"`
	AccountRef      string         `json:"account_ref"`
	AmountMinor     string         `json:"amount_minor"`
	BaseAmountMinor string         `json:"base_amount_minor"`
	FXRate          string         `json:"fx_rate"`
	FXSource        string         `json:"fx_source"`
}

type entryResponse struct {
	Ref                 string            `json:"ref"`
	IdempotencyKey      string            `json:"idempotency_key,omitempty"`
	OccurredOn          string            `json:"occurred_on"`
	Currency            string            `json:"currency"`
	Source              string            `json:"source"`
	Note                string            `json:"note,omitempty"`
	Payee               *payeeSummary     `json:"payee,omitempty"`
	VoidedAt            string            `json:"voided_at,omitempty"`
	Postings            []postingResponse `json:"postings"`
	RunningBalanceMinor string            `json:"running_balance_minor,omitempty"`
}

type entryPatchRequest struct {
	Void       *bool            `json:"void,omitempty"`
	Reason     string           `json:"reason,omitempty"      validate:"max=2000"`
	PayeeRef   *string          `json:"payee_ref,omitempty"   validate:"omitempty,ref"`
	OccurredOn string           `json:"occurred_on,omitempty" validate:"omitempty,datestr"`
	Note       *string          `json:"note,omitempty"        validate:"omitempty,max=2000"`
	Postings   []postingRequest `json:"postings,omitempty"    validate:"omitempty,min=2,dive"`
}

func (s *Server) ListEntries(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, entryFilter)
	if !ok {
		return
	}

	names, err := s.displayNames(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	writeList(
		ctx, w, s, "entries", filter.Limit,
		func() ([]entity.Entry, error) { return s.deps.Ledger.List(ctx, filter) },
		func(entry entity.Entry) string { return entry.Ref },
		func(entry entity.Entry) entryResponse { return toEntryResponse(entry, names) },
	)
}

func (s *Server) GetEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Get")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	entry, err := s.deps.Ledger.Get(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	body, err := s.entryResponse(ctx, entry)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, body)
}

func (s *Server) PatchEntry(w http.ResponseWriter, r *http.Request) {
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

	entry, ok := s.entryPatch(ctx, w, path.Ref, request)
	if !ok {
		return
	}

	body, err := s.entryResponse(ctx, entry)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, body)
}

func (s *Server) entryPatch(
	ctx context.Context,
	w http.ResponseWriter,
	ref string,
	request entryPatchRequest,
) (entity.Entry, bool) {
	action, ok := entryPatchAction(w, request)
	if !ok {
		return entity.Entry{}, false
	}

	return s.applyEntryPatch(ctx, w, ref, action, request)
}

func (s *Server) applyEntryPatch(
	ctx context.Context,
	w http.ResponseWriter,
	ref, action string,
	request entryPatchRequest,
) (entity.Entry, bool) {
	var (
		entry entity.Entry
		err   error
	)

	switch action {
	case entryPatchVoid:
		entry, err = s.deps.Ledger.Void(ctx, ref, request.Reason)
	case entryPatchPayee:
		entry, err = s.deps.Ledger.UpdatePayee(ctx, ref, *request.PayeeRef)
	default:
		input, ok := correctionInput(w, request)
		if !ok {
			return entity.Entry{}, false
		}

		entry, err = s.deps.Ledger.Correct(ctx, ref, input)
	}

	if err != nil {
		s.writeClassified(ctx, w, err)

		return entity.Entry{}, false
	}

	return entry, true
}

func (s *Server) PostEntry(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Entries.Post")
	defer endSpan()

	var request postEntryRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	input, err := toPostInput(ctx, request)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput, err.Error())

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

	body, err := s.entryResponse(ctx, entry)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, status, body)
}

func toPostInput(ctx context.Context, request postEntryRequest) (ledger.PostInput, error) {
	occurredOn, err := validating.Day(request.OccurredOn, "occurred_on")
	if err != nil {
		return ledger.PostInput{}, err
	}

	postings, err := postingInputs(request.Postings)
	if err != nil {
		return ledger.PostInput{}, err
	}

	clientID := idem.Normalize(request.IdempotencyKey)
	if clientID == "" {
		minted, mintErr := idem.Mint(ctx)
		if mintErr != nil {
			return ledger.PostInput{}, mintErr
		}

		clientID = minted
	}

	return ledger.PostInput{
		IdempotencyKey: clientID,
		OccurredOn:     occurredOn,
		PayeeRef:       request.PayeeRef,
		Note:           request.Note,
		Currency:       request.Currency,
		Source:         request.Source,
		Postings:       postings,
	}, nil
}

type displayNames struct {
	accounts map[string]entity.Account
	payees   map[string]entity.Payee
}

func (s *Server) displayNames(ctx context.Context) (displayNames, error) {
	accounts, err := allPages(ctx, list.MaxLimit,
		func(account entity.Account) string { return account.Ref },
		func(ctx context.Context, cursor string, limit int) ([]entity.Account, error) {
			return s.deps.Accounts.ListAccounts(ctx, entity.AccountFilter{Cursor: cursor, Limit: limit})
		})
	if err != nil {
		return displayNames{}, err
	}

	payees, err := allPages(ctx, list.MaxLimit,
		func(payee entity.Payee) string { return payee.Ref },
		func(ctx context.Context, cursor string, limit int) ([]entity.Payee, error) {
			return s.deps.Payees.ListPayees(ctx, entity.PayeeFilter{Cursor: cursor, Limit: limit})
		})
	if err != nil {
		return displayNames{}, err
	}

	names := displayNames{
		accounts: make(map[string]entity.Account, len(accounts)),
		payees:   make(map[string]entity.Payee, len(payees)),
	}

	for _, account := range accounts {
		names.accounts[account.Ref] = account
	}

	for _, payee := range payees {
		names.payees[payee.Ref] = payee
	}

	return names, nil
}

func (s *Server) entryResponse(ctx context.Context, entry entity.Entry) (entryResponse, error) {
	names, err := s.displayNames(ctx)
	if err != nil {
		return entryResponse{}, err
	}

	return toEntryResponse(entry, names), nil
}

func toEntryResponse(entry entity.Entry, names displayNames) entryResponse {
	out := entryResponse{
		Ref:            entry.Ref,
		IdempotencyKey: entry.IdempotencyKey,
		OccurredOn:     entry.OccurredOn.Format(constant.DateLayout),
		Currency:       entry.Currency,
		Source:         entry.Source,
		Note:           entry.Note,
	}

	if entry.RunningBalanceMinor != nil {
		out.RunningBalanceMinor = strconv.FormatInt(*entry.RunningBalanceMinor, 10)
	}

	if entry.VoidedAt != nil {
		out.VoidedAt = entry.VoidedAt.Format(constant.TimestampLayout)
	}

	if entry.PayeeRef != "" {
		if payee, ok := names.payees[entry.PayeeRef]; ok {
			out.Payee = &payeeSummary{Ref: payee.Ref, Name: payee.Name}
		}
	}

	for _, posting := range entry.Postings {
		account := accountSummary{Ref: posting.AccountRef}
		if known, ok := names.accounts[posting.AccountRef]; ok {
			account.Name = known.Name
			account.Kind = known.Kind
		}

		out.Postings = append(out.Postings, postingResponse{
			Account:         account,
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
	{entity.ErrInvalidAmount, http.StatusUnprocessableEntity, "invalid_amount"},
	{entity.ErrSecretMismatch, http.StatusConflict, "secret_mismatch"},
	{entity.ErrNotFound, http.StatusNotFound, "not_found"},
	{entity.ErrDuplicate, http.StatusConflict, "duplicate"},
	{entity.ErrInvalidParent, http.StatusUnprocessableEntity, codeInvalidInput},
	{entity.ErrUnknownCaptureKind, http.StatusUnprocessableEntity, "unknown_capture_kind"},
	{entity.ErrInvalidSetup, http.StatusUnprocessableEntity, codeInvalidInput},
	{entity.ErrCaptureResolved, http.StatusConflict, "capture_resolved"},
	{entity.ErrInvalidState, http.StatusConflict, "invalid_state"},
	{entity.ErrPasswordMismatch, http.StatusUnauthorized, "invalid_password"},
	{entity.ErrWeakPassword, http.StatusUnprocessableEntity, "weak_password"},
	{entity.ErrBaseCurrencyLocked, http.StatusConflict, "base_currency_locked"},
	{entity.ErrSetupConflict, http.StatusConflict, "setup_conflict"},
	{entity.ErrImportConflict, http.StatusConflict, "import_conflict"},
	{entity.ErrImportChunkConflict, http.StatusConflict, "import_conflict"},
	{entity.ErrImportClosed, http.StatusConflict, "import_closed"},
	{entity.ErrImportCommitting, http.StatusConflict, "import_committing"},
	{entity.ErrInvalidImport, http.StatusUnprocessableEntity, codeInvalidInput},
	{entity.ErrExportConflict, http.StatusConflict, "export_conflict"},
	{entity.ErrExportNotReady, http.StatusConflict, "export_not_ready"},
	{entity.ErrExportFailed, http.StatusConflict, "export_failed"},
	{entity.ErrExportExpired, http.StatusGone, "gone"},
	{connections.ErrStateInvalid, http.StatusUnauthorized, "invalid_state"},
	{connections.ErrReauthRequired, http.StatusConflict, "reauth_required"},
	{connections.ErrClientMissing, http.StatusUnprocessableEntity, codeInvalidInput},
	{connections.ErrNotConnected, http.StatusNotFound, "not_found"},
	{intake.ErrNotConfigured, http.StatusConflict, "intake_disabled"},
}

func correctionInput(w http.ResponseWriter, request entryPatchRequest) (ledger.CorrectInput, bool) {
	input := ledger.CorrectInput{Note: request.Note, Reason: request.Reason}

	if request.OccurredOn != "" {
		occurredOn, err := validating.Day(request.OccurredOn, "occurred_on")
		if err != nil {
			writeInvalid(w, err)

			return ledger.CorrectInput{}, false
		}

		input.OccurredOn = &occurredOn
	}

	postings, err := postingInputs(request.Postings)
	if err != nil {
		writeInvalid(w, err)

		return ledger.CorrectInput{}, false
	}

	input.Postings = postings

	return input, true
}

func postingInputs(request []postingRequest) ([]ledger.PostingInput, error) {
	postings := make([]ledger.PostingInput, 0, len(request))

	for _, posting := range request {
		amount, err := validating.Money(posting.AmountMinor, "amount_minor")
		if err != nil {
			return nil, err
		}

		postings = append(postings, ledger.PostingInput{
			AccountRef:  posting.AccountRef,
			AmountMinor: amount,
			FXRate:      posting.FXRate,
			FXRateDate:  posting.FXRateDate,
		})
	}

	return postings, nil
}

const (
	entryPatchVoid    = "void"
	entryPatchPayee   = "payee"
	entryPatchCorrect = "correct"
)

func entryPatchAction(w http.ResponseWriter, request entryPatchRequest) (string, bool) {
	corrects := request.OccurredOn != "" || request.Note != nil || len(request.Postings) > 0

	actions := 0

	for _, present := range []bool{request.Void != nil, request.PayeeRef != nil, corrects} {
		if present {
			actions++
		}
	}

	switch {
	case actions == 0:
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput,
			`send {"void": true}, {"payee_ref": "..."} or the corrected occurred_on/note/postings`)

		return "", false
	case actions > 1:
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput,
			"void, payee_ref and a correction are separate actions")

		return "", false
	case request.Void != nil && !*request.Void:
		httpx.WriteError(w, http.StatusUnprocessableEntity, "unsupported_patch",
			`only {"void": true} is supported today`)

		return "", false
	}

	switch {
	case request.Void != nil:
		return entryPatchVoid, true
	case request.PayeeRef != nil:
		return entryPatchPayee, true
	default:
		return entryPatchCorrect, true
	}
}
