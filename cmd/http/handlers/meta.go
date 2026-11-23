package handlers

import (
	"net/http"
	"strconv"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type currencyResponse struct {
	Code       string `json:"code"`
	MinorUnits int32  `json:"minor_units"`
	Symbol     string `json:"symbol"`
}

type accountResponse struct {
	Ref             string `json:"ref"`
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	Currency        string `json:"currency"`
	BaseAmountMinor string `json:"base_amount_minor"`
	Icon            string `json:"icon,omitempty"`
	Archived        bool   `json:"archived"`
}

type metaResponse struct {
	Settings   map[string]any     `json:"settings"`
	Accounts   []accountResponse  `json:"accounts"`
	Currencies []currencyResponse `json:"currencies"`
}

func (s *server) handleMeta(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Meta.Get")
	defer endSpan()

	appSettings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	baseCurrency := appSettings.BaseCurrency

	accounts, err := s.deps.Accounts.ListAccounts(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	balances, err := s.deps.Accounts.BalancesByAccount(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out := metaResponse{
		Settings: map[string]any{
			"base_currency":      baseCurrency,
			"extraction_enabled": s.deps.ExtractionEnabled,
		},
		Accounts:   make([]accountResponse, 0, len(accounts)),
		Currencies: make([]currencyResponse, 0, len(entity.Currencies())),
	}

	for _, account := range accounts {
		out.Accounts = append(out.Accounts, accountResponse{
			Ref:             account.Ref,
			Name:            account.Name,
			Kind:            account.Kind,
			Currency:        account.Currency,
			BaseAmountMinor: strconv.FormatInt(balances[account.ID], 10),
			Icon:            account.Icon,
			Archived:        account.ArchivedAt != nil,
		})
	}

	for _, currency := range entity.Currencies() {
		out.Currencies = append(out.Currencies, currencyResponse{
			Code:       currency.Code,
			MinorUnits: currency.MinorUnits,
			Symbol:     currency.Symbol,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}
