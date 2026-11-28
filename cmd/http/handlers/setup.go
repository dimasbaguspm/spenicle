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
	OpeningBalanceMinor string `json:"opening_balance_minor" pattern:"^[+-]?[0-9]+$"         validate:"required,money"`
}

type setupRequest struct {
	Password     string                `json:"password"      maxLength:"200"                   minLength:"12"`
	BaseCurrency string                `json:"base_currency" maxLength:"3"                     minLength:"3"  validate:"omitempty,currency"`
	Accounts     []setupAccountRequest `json:"accounts"      validate:"omitempty,max=100,dive"`
}

// @Summary     Claim the instance: set the password, choose the base currency, post the opening balances
// @Description Completes once, and it is the only write a fresh instance accepts: until it lands there is no password, so every request is the root credential. It sets the PBKDF2 hash, locks the base currency and every opening balance, and posts each opening balance as one balanced entry against an `Opening balance` equity account.
// @Tags        settings
// @Accept      json
// @Param       body body setupRequest true "the request body"
// @Produce     json
// @Success     200 {object} settingsResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody "empty_setup, unknown_currency, weak_password"
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/setup [post]
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

	settings, err := s.deps.Settings.Setup(ctx, request.Password, request.BaseCurrency, accounts)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	s.writeSettings(w, settings)
}
