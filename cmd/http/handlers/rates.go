package handlers

import (
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type rateQuery struct {
	Base  string `query:"base"  validate:"required,currency"`
	Quote string `query:"quote" validate:"required,currency"`
	On    string `query:"on"    validate:"omitempty,datestr"`
}

type rateResponse struct {
	Ref       string `json:"ref"         pattern:"^[0-9a-f]{32}$"`
	Base      string `json:"base"        maxLength:"3"                  minLength:"3"`
	Quote     string `json:"quote"       maxLength:"3"                  minLength:"3"`
	OnDate    string `format:"date"      json:"on_date"`
	Rate      string `json:"rate"        pattern:"^[0-9]+(\\.[0-9]+)?$"`
	Source    string `json:"source"`
	FetchedAt string `format:"date-time" json:"fetched_at"`
}

// @Summary     The cached ECB reference rate for one day
// @Description Answers from the in-memory cache, then the stored sheet for that exact day, then the nearest earlier day, then a cross rate through EUR. `on` defaults to today in `APP_TIMEZONE`.
// @Tags        rates
// @Produce     json
// @Param       base query string true "ISO 4217"
// @Param       quote query string true "ISO 4217"
// @Param       on query string false "the day to price, default today"
// @Success     200 {object} rateResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     404 {object} httpx.ErrorBody "no rate for that pair"
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/rates [get]
func (s *Server) GetRate(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Rates.Get")
	defer endSpan()

	var query rateQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	var on time.Time

	if query.On != "" {
		parsed, err := validating.Day(query.On, "on")
		if err != nil {
			writeInvalid(w, err)

			return
		}

		on = parsed
	}

	rate, found, err := s.deps.Rates.Rate(ctx, query.Base, query.Quote, on)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", rateNotFound(query, on))

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

func rateNotFound(query rateQuery, on time.Time) string {
	until := "today"
	if !on.IsZero() {
		until = "on or before " + query.On
	}

	return "not found: no " + query.Base + "/" + query.Quote + " rate " + until
}
