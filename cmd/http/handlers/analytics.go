package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

const analyticsWindowMonths = 12

type analyticsRangeQuery struct {
	From string `query:"from" validate:"omitempty,datestr"`
	To   string `query:"to"   validate:"omitempty,datestr"`
}

type monthTotalResponse struct {
	Month       string `json:"month"`
	SpendMinor  string `json:"spend_minor"`
	IncomeMinor string `json:"income_minor"`
	NetMinor    string `json:"net_minor"`
}

type monthlyAnalyticsResponse struct {
	From   string               `json:"from"`
	To     string               `json:"to"`
	Months []monthTotalResponse `json:"months"`
}

func (s *server) handleMonthlyAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Months")
	defer endSpan()

	var query analyticsRangeQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(query)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	totals, err := s.deps.Analytics.MonthlyTotals(ctx, from, to)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out := monthlyAnalyticsResponse{
		From:   from.Format(constant.DateLayout),
		To:     to.Format(constant.DateLayout),
		Months: make([]monthTotalResponse, 0, len(totals)),
	}

	for _, total := range totals {
		out.Months = append(out.Months, monthTotalResponse{
			Month:       total.Month,
			SpendMinor:  strconv.FormatInt(total.SpendMinor, 10),
			IncomeMinor: strconv.FormatInt(total.IncomeMinor, 10),
			NetMinor:    strconv.FormatInt(total.NetMinor, 10),
		})
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func analyticsWindow(query analyticsRangeQuery) (time.Time, time.Time, error) {
	now := time.Now().UTC()

	to := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	from := to.AddDate(0, -(analyticsWindowMonths - 1), 0)
	from = time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, time.UTC)

	if query.From != "" {
		parsed, err := time.Parse(constant.DateLayout, query.From)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("parse from: %w", err)
		}

		from = parsed
	}

	if query.To != "" {
		parsed, err := time.Parse(constant.DateLayout, query.To)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("parse to: %w", err)
		}

		to = parsed
	}

	return from, to, nil
}

type categoryAnalyticsQuery struct {
	From string `query:"from" validate:"omitempty,datestr"`
	To   string `query:"to"   validate:"omitempty,datestr"`
	Kind string `query:"kind" validate:"omitempty,oneof=expense income"`
}

type categoryTotalResponse struct {
	AccountRef  string `json:"account_ref"`
	AccountName string `json:"account_name"`
	AmountMinor string `json:"amount_minor"`
}

type categoryAnalyticsResponse struct {
	From       string                  `json:"from"`
	To         string                  `json:"to"`
	Kind       string                  `json:"kind"`
	Categories []categoryTotalResponse `json:"categories"`
}

func (s *server) handleCategoryAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Categories")
	defer endSpan()

	var query categoryAnalyticsQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(analyticsRangeQuery{From: query.From, To: query.To})
	if err != nil {
		writeInvalid(w, err)

		return
	}

	kind := query.Kind
	if kind == "" {
		kind = "expense"
	}

	totals, err := s.deps.Analytics.CategoryTotals(ctx, from, to, kind)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out := categoryAnalyticsResponse{
		From:       from.Format(constant.DateLayout),
		To:         to.Format(constant.DateLayout),
		Kind:       kind,
		Categories: make([]categoryTotalResponse, 0, len(totals)),
	}

	for _, total := range totals {
		out.Categories = append(out.Categories, categoryTotalResponse{
			AccountRef:  total.AccountRef,
			AccountName: total.AccountName,
			AmountMinor: strconv.FormatInt(total.AmountMinor, 10),
		})
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}
