package handlers

import (
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type rateQuery struct {
	Base  string `query:"base"  validate:"required,currency"`
	Quote string `query:"quote" validate:"required,currency"`
	On    string `query:"on"    validate:"omitempty,datestr"`
}

type rateResponse struct {
	Ref       string `json:"ref"`
	Base      string `json:"base"`
	Quote     string `json:"quote"`
	OnDate    string `json:"on_date"`
	Rate      string `json:"rate"`
	Source    string `json:"source"`
	FetchedAt string `json:"fetched_at"`
}

func (s *server) handleGetRate(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Rates.Get")
	defer endSpan()

	var query rateQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	var on time.Time

	if query.On != "" {
		parsed, err := time.Parse(constant.DateLayout, query.On)
		if err != nil {
			writeInvalid(w, err)

			return
		}

		on = parsed
	}

	rate, err := s.deps.Rates.Rate(ctx, query.Base, query.Quote, on)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, rateResponse{
		Ref:       rate.Ref,
		Base:      rate.Base,
		Quote:     rate.Quote,
		OnDate:    rate.OnDate.Format(constant.DateLayout),
		Rate:      rate.Rate,
		Source:    rate.Source,
		FetchedAt: rate.FetchedAt.Format(constant.TimestampLayout),
	})
}
