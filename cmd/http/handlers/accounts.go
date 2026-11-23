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
	Name     string `json:"name"     validate:"required,max=80"`
	Kind     string `json:"kind"     validate:"required,accountkind"`
	Currency string `json:"currency" validate:"omitempty,currency"`
}

type accountPatchRequest struct {
	Name     *string `json:"name,omitempty"     validate:"omitempty,max=80"`
	Icon     *string `json:"icon,omitempty"     validate:"omitempty,max=32"`
	Archived *bool   `json:"archived,omitempty"`
}

type accountDetailResponse struct {
	Ref      string `json:"ref"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Currency string `json:"currency"`
	Icon     string `json:"icon,omitempty"`
	Archived bool   `json:"archived"`
}

func (s *Server) CreateAccount(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Accounts.Post")
	defer endSpan()

	var request accountCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	currency := request.Currency
	if currency == "" {
		currency = s.deps.BaseCurrency
	}

	if _, err := entity.CurrencyByCode(currency); err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	account, err := s.deps.Accounts.CreateAccount(ctx, request.Name, request.Kind, currency)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toAccountResponse(account))
}

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
		Ref:      account.Ref,
		Name:     account.Name,
		Kind:     account.Kind,
		Currency: account.Currency,
		Icon:     account.Icon,
		Archived: account.ArchivedAt != nil,
	}
}

func archivedAt(archived bool) *time.Time {
	if !archived {
		return nil
	}

	now := time.Now().UTC()

	return &now
}

func (s *Server) ListAccounts(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Accounts.List")
	defer endSpan()

	filter, ok := bindListParams(w, r, accountFilter)
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

func accountRow(account entity.Account, balances map[int64]int64) accountResponse {
	return accountResponse{
		Ref:             account.Ref,
		Name:            account.Name,
		Kind:            account.Kind,
		Currency:        account.Currency,
		BaseAmountMinor: strconv.FormatInt(balances[account.ID], 10),
		Icon:            account.Icon,
		Archived:        account.ArchivedAt != nil,
	}
}
