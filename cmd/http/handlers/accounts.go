package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type accountCreateRequest struct {
	Name      string `json:"name"       validate:"required,max=80"`
	Kind      string `json:"kind"       validate:"required,accountkind"`
	Currency  string `json:"currency"   maxLength:"3"                   minLength:"3"            validate:"omitempty,currency"`
	ParentRef string `json:"parent_ref" pattern:"^[0-9a-f]{32}$"        validate:"omitempty,ref"`
}

type accountPatchRequest struct {
	Name      *string `json:"name,omitempty"       validate:"omitempty,max=80"`
	Icon      *string `json:"icon,omitempty"       validate:"omitempty,max=32"`
	ParentRef *string `json:"parent_ref,omitempty" pattern:"^[0-9a-f]{32}$"    validate:"omitempty,ref"`
	Archived  *bool   `json:"archived,omitempty"`
}

type accountDetailResponse struct {
	Ref       string `json:"ref"                  pattern:"^[0-9a-f]{32}$"`
	Name      string `json:"name"`
	Kind      string `json:"kind"`
	Currency  string `json:"currency"             maxLength:"3"            minLength:"3"`
	ParentRef string `json:"parent_ref,omitempty" pattern:"^[0-9a-f]{32}$"`
	Icon      string `json:"icon,omitempty"`
	Archived  bool   `json:"archived"`
}

// @Summary     Create an account or a category
// @Description `kind` decides what it is: asset, liability, equity, expense or income. A missing `currency` inherits the base currency; a `parent_ref` must name an existing account.
// @Tags        accounts
// @Accept      json
// @Param       body body accountCreateRequest true "the request body"
// @Produce     json
// @Success     201 {object} accountDetailResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody "unknown_currency, unknown_reference"
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/accounts [post]
func (s *Server) CreateAccount(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Accounts.Post")
	defer endSpan()

	var request accountCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	currency := request.Currency
	if currency == "" {
		baseCurrency, err := s.deps.Settings.BaseCurrency(ctx)
		if err != nil {
			s.writeClassified(ctx, w, err)

			return
		}

		currency = baseCurrency
	}

	if _, err := entity.CurrencyByCode(currency); err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !s.parentExists(ctx, w, request.ParentRef) {
		return
	}

	account, err := s.deps.Accounts.CreateAccountWithParent(
		ctx, request.Name, request.Kind, currency, request.ParentRef,
	)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toAccountResponse(account))
}

func (s *Server) parentExists(ctx context.Context, w http.ResponseWriter, ref string) bool {
	if ref == "" {
		return true
	}

	if _, found, err := s.deps.Accounts.AccountByRef(ctx, ref); err != nil || !found {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "unknown_reference", "no account "+ref)

		return false
	}

	return true
}

// @Summary     Rename, re-icon, reparent or archive an account
// @Description Send absolute values only; an omitted field is left alone. Archiving is `archived: true` and never deletes the row.
// @Tags        accounts
// @Accept      json
// @Param       body body accountPatchRequest true "the request body"
// @Produce     json
// @Param       ref path string true "32 lowercase hex ref"
// @Success     200 {object} accountDetailResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/accounts/{ref} [patch]
func (s *Server) PatchAccount(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Accounts.Patch")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request accountPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	account, found, err := s.deps.Accounts.AccountByRef(ctx, path.Ref)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no account "+path.Ref)

		return
	}

	if request.Name != nil {
		account.Name = *request.Name
	}

	if request.Icon != nil {
		account.Icon = *request.Icon
	}

	if request.ParentRef != nil {
		if !s.parentExists(ctx, w, *request.ParentRef) {
			return
		}

		account.ParentRef = *request.ParentRef
	}

	if request.Archived != nil {
		account.ArchivedAt = archivedAt(*request.Archived)
	}

	updated, err := s.deps.Accounts.UpdateAccount(ctx, account)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toAccountResponse(updated))
}

func toAccountResponse(account entity.Account) accountDetailResponse {
	return accountDetailResponse{
		Ref:       account.Ref,
		Name:      account.Name,
		Kind:      account.Kind,
		Currency:  account.Currency,
		ParentRef: account.ParentRef,
		Icon:      account.Icon,
		Archived:  account.ArchivedAt != nil,
	}
}

func archivedAt(archived bool) *time.Time {
	if !archived {
		return nil
	}

	now := time.Now().UTC()

	return &now
}

// @Summary     Every account with the balance the ledger implies
// @Description Balances are in the account's own currency, `base_amount_minor` in the base currency. Filters widen: a `* list` parameter takes comma-separated values.
// @Tags        accounts
// @Produce     json
// @Param       query query string false "substring of the name"
// @Param       refs query string false "account refs, comma-separated"
// @Param       currency query string false "ISO 4217"
// @Param       kind query string false "asset, liability, equity, expense, income"
// @Param       parent_ref query string false "children of this account"
// @Param       archived query string false "true only archived, false only live"
// @Param       cursor query string false "return accounts after this ref"
// @Param       limit query int false "max 200, default 50"
// @Success     200 {object} object{accounts=[]accountResponse,limit=int,has_more=bool,next_cursor=string}
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/accounts [get]
func (s *Server) ListAccounts(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Accounts.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, s.location, accountFilter)
	if !ok {
		return
	}

	balances, err := s.deps.Accounts.BalancesByAccount(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	writeList(
		ctx, w, s, "accounts", filter.Limit,
		func() ([]entity.Account, error) { return s.deps.Accounts.ListAccounts(ctx, filter) },
		func(account entity.Account) string { return account.Ref },
		func(account entity.Account) accountResponse { return accountRow(account, balances) },
	)
}

func (s *Server) accountResponses(
	ctx context.Context,
	accounts []entity.Account,
) ([]accountResponse, error) {
	balances, err := s.deps.Accounts.BalancesByAccount(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]accountResponse, 0, len(accounts))

	for _, account := range accounts {
		out = append(out, accountRow(account, balances))
	}

	return out, nil
}

func accountRow(account entity.Account, balances map[string]int64) accountResponse {
	return accountResponse{
		Ref:             account.Ref,
		Name:            account.Name,
		Kind:            account.Kind,
		Currency:        account.Currency,
		BaseAmountMinor: strconv.FormatInt(balances[account.Ref], 10),
		ParentRef:       account.ParentRef,
		Icon:            account.Icon,
		Archived:        account.ArchivedAt != nil,
	}
}
