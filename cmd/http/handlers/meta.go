package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	"github.com/dimasbaguspm/spenicle/internal/common/list"
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

func (s *Server) GetMeta(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Meta.Get")
	defer endSpan()

	appSettings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	accounts, err := s.deps.Accounts.ListAccounts(ctx, entity.AccountFilter{Limit: list.MaxLimit})
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	accountBodies, err := s.accountResponses(ctx, accounts)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out := metaResponse{
		Settings:   metaSettings(appSettings, s.deps.ExtractionEnabled, s.deps.AIAssistance),
		Accounts:   accountBodies,
		Currencies: make([]currencyResponse, 0, len(entity.Currencies())),
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

func metaSettings(settings entity.Settings, extraction, ai bool) map[string]any {
	return map[string]any{
		"base_currency":      settings.BaseCurrency,
		"timezone":           settings.Timezone,
		"extraction_enabled": extraction,
		"ai_assistance":      ai,
	}
}
