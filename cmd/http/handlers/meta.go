package handlers

import (
	"context"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type currencyResponse struct {
	Code       string `json:"code"`
	MinorUnits int32  `json:"minor_units"`
	Symbol     string `json:"symbol"`
}

type accountResponse struct {
	Ref             string `json:"ref"                  pattern:"^[0-9a-f]{32}$"`
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	Currency        string `json:"currency"             maxLength:"3"            minLength:"3"`
	BaseAmountMinor string `json:"base_amount_minor"    pattern:"^[+-]?[0-9]+$"`
	ParentRef       string `json:"parent_ref,omitempty" pattern:"^[0-9a-f]{32}$"`
	Icon            string `json:"icon,omitempty"`
	Archived        bool   `json:"archived"`
}

type metaResponse struct {
	AppSecret  string              `json:"app_secret"`
	Settings   settingsResponse    `json:"settings"`
	Accounts   []accountResponse   `json:"accounts"`
	Payees     []payeeResponse     `json:"payees"`
	Recurring  []recurringResponse `json:"recurring"`
	Currencies []currencyResponse  `json:"currencies"`
}

// @Summary     Bootstrap payload: settings, accounts, payees, recurring rules, currencies
// @Description Everything the shell needs before its first screen, in one response.
// @Tags        settings
// @Produce     json
// @Success     200 {object} metaResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/meta [get]
func (s *Server) GetMeta(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Meta.Get")
	defer endSpan()

	if !requireScopes(ctx, w, constant.ScopeSettingsRead, constant.ScopeAccountsRead,
		constant.ScopePayeesRead, constant.ScopeRecurringRead) {
		return
	}

	appSettings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	accounts, err := allPages(ctx, list.MaxLimit,
		func(account entity.Account) string { return account.Ref },
		func(ctx context.Context, cursor string, limit int) ([]entity.Account, error) {
			return s.deps.Accounts.ListAccounts(ctx, entity.AccountFilter{Cursor: cursor, Limit: limit})
		})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	accountBodies, err := s.accountResponses(ctx, accounts)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	payees, err := allPages(ctx, list.MaxLimit,
		func(payee entity.Payee) string { return payee.Ref },
		func(ctx context.Context, cursor string, limit int) ([]entity.Payee, error) {
			return s.deps.Payees.ListPayees(ctx, entity.PayeeFilter{Cursor: cursor, Limit: limit})
		})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	rules, err := allPages(ctx, list.MaxLimit,
		func(rule entity.Recurring) string { return rule.Ref },
		func(ctx context.Context, cursor string, limit int) ([]entity.Recurring, error) {
			return s.deps.Recurring.ListRecurring(ctx, entity.RecurringFilter{Cursor: cursor, Limit: limit})
		})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	payeeBodies, recurringBodies := toMetaCollections(payees, rules)
	out := metaResponse{
		AppSecret:  s.deps.Sealer.Fingerprint(),
		Settings:   toSettingsResponse(appSettings, s.deps.ExtractionEnabled, s.deps.AIAssistance),
		Accounts:   accountBodies,
		Payees:     payeeBodies,
		Recurring:  recurringBodies,
		Currencies: currencyResponses(),
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func toMetaCollections(
	payees []entity.Payee,
	rules []entity.Recurring,
) ([]payeeResponse, []recurringResponse) {
	payeeBodies := make([]payeeResponse, 0, len(payees))
	for _, payee := range payees {
		payeeBodies = append(payeeBodies, toPayeeResponse(payee))
	}

	recurringBodies := make([]recurringResponse, 0, len(rules))
	for _, rule := range rules {
		recurringBodies = append(recurringBodies, toRecurringResponse(rule))
	}

	return payeeBodies, recurringBodies
}

func currencyResponses() []currencyResponse {
	currencies := entity.Currencies()

	out := make([]currencyResponse, 0, len(currencies))
	for _, currency := range currencies {
		out = append(out, currencyResponse{
			Code:       currency.Code,
			MinorUnits: currency.MinorUnits,
			Symbol:     currency.Symbol,
		})
	}

	return out
}

func allPages[T any](
	ctx context.Context,
	limit int,
	refOf func(T) string,
	fetch func(context.Context, string, int) ([]T, error),
) ([]T, error) {
	out := make([]T, 0)
	cursor := ""

	for {
		items, err := fetch(ctx, cursor, limit)
		if err != nil {
			return nil, err
		}

		page, meta := list.Paginate(items, limit, refOf)
		out = append(out, page...)

		if !meta.HasMore {
			return out, nil
		}

		cursor = meta.NextCursor
	}
}
