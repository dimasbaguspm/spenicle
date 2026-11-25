package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type setupAccountRequest struct {
	Name                string `json:"name"                  validate:"required,max=80"`
	Kind                string `json:"kind"                  validate:"required,accountkind"`
	OpeningBalanceMinor string `json:"opening_balance_minor" validate:"required,money"`
}

type setupRequest struct {
	BaseCurrency string                `json:"base_currency" validate:"omitempty,currency"`
	Accounts     []setupAccountRequest `json:"accounts"      validate:"omitempty,max=100,dive"`
}

func (s *Server) Setup(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Setup.Post")
	defer endSpan()

	var request setupRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	if request.BaseCurrency == "" {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "empty_setup",
			"send base_currency to open the ledger")

		return
	}

	accounts := make([]entity.OpeningAccount, 0, len(request.Accounts))
	for _, account := range request.Accounts {
		amount, err := validating.Money(account.OpeningBalanceMinor, "opening_balance_minor")
		if err != nil {
			writeInvalid(w, err)
			return
		}

		accounts = append(accounts, entity.OpeningAccount{
			Name: account.Name, Kind: account.Kind, AmountMinor: amount,
		})
	}

	settings, err := s.deps.Settings.Setup(ctx, request.BaseCurrency, accounts)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	s.writeSettings(w, settings)
}
