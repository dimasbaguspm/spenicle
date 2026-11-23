package handlers

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

type setupRequest struct {
	BaseCurrency string `json:"base_currency" validate:"omitempty,currency"`
}

func (s *server) handleSetup(w http.ResponseWriter, r *http.Request) {
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

	settings, err := s.deps.Settings.SetBaseCurrency(ctx, request.BaseCurrency)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toSettingsResponse(settings))
}
