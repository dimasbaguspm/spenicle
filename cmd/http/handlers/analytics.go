package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
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

func (s *Server) MonthlyAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Months")
	defer endSpan()

	var query analyticsRangeQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(query)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput, err.Error())

		return
	}

	totals, err := s.deps.Analytics.MonthlyTotals(ctx, from, to)
	if err != nil {
		s.writeClassified(ctx, w, err)

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

	if query.To != "" {
		parsed, err := validating.Day(query.To, "to")
		if err != nil {
			return time.Time{}, time.Time{}, err
		}

		to = parsed
	}

	from := time.Date(to.Year(), to.Month()-(analyticsWindowMonths-1), 1, 0, 0, 0, 0, time.UTC)

	if query.From != "" {
		parsed, err := validating.Day(query.From, "from")
		if err != nil {
			return time.Time{}, time.Time{}, err
		}

		from = parsed
	}

	if from.After(to) {
		return time.Time{}, time.Time{}, errors.New("from must not be after to")
	}

	return from, to, nil
}

type categoryAnalyticsQuery struct {
	From   string `query:"from"   validate:"omitempty,datestr"`
	To     string `query:"to"     validate:"omitempty,datestr"`
	Kind   string `query:"kind"   validate:"omitempty,oneof=expense income"`
	Rollup string `query:"rollup" validate:"omitempty,oneof=parent"`
	Bucket string `query:"bucket" validate:"omitempty,oneof=month"`
}

type categoryTotalResponse struct {
	AccountRef      string `json:"account_ref"`
	AccountName     string `json:"account_name"`
	AmountMinor     string `json:"amount_minor"`
	FirstOccurredOn string `json:"first_occurred_on,omitempty"`
	LastOccurredOn  string `json:"last_occurred_on,omitempty"`
}

type categoryAnalyticsResponse struct {
	From       string                  `json:"from"`
	To         string                  `json:"to"`
	Kind       string                  `json:"kind"`
	Categories []categoryTotalResponse `json:"categories"`
}

type categoryMonthResponse struct {
	Month      string `json:"month"`
	SpendMinor string `json:"spend_minor"`
}

type categoryMonthsResponse struct {
	AccountRef  string                  `json:"account_ref"`
	AccountName string                  `json:"account_name"`
	Months      []categoryMonthResponse `json:"months"`
}

type bucketedCategoryAnalyticsResponse struct {
	From       string                   `json:"from"`
	To         string                   `json:"to"`
	Kind       string                   `json:"kind"`
	Bucket     string                   `json:"bucket"`
	Categories []categoryMonthsResponse `json:"categories"`
}

func (s *Server) CategoryAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Categories")
	defer endSpan()

	var query categoryAnalyticsQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(analyticsRangeQuery{From: query.From, To: query.To})
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput, err.Error())

		return
	}

	kind := query.Kind
	if kind == "" {
		kind = "expense"
	}

	if query.Bucket != "" && query.Rollup != "" {
		writeBucketRollup(w)

		return
	}

	if query.Bucket == "month" {
		s.writeCategoryMonths(ctx, w, from, to, kind)

		return
	}

	categories := s.deps.Analytics.CategoryTotals
	if query.Rollup == "parent" {
		categories = s.deps.Analytics.CategoryTotalsByRoot
	}

	totals, err := categories(ctx, from, to, kind)
	if err != nil {
		s.writeClassified(ctx, w, err)

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
			AccountRef:      total.AccountRef,
			AccountName:     total.AccountName,
			AmountMinor:     strconv.FormatInt(total.AmountMinor, 10),
			FirstOccurredOn: total.FirstOccurredOn,
			LastOccurredOn:  total.LastOccurredOn,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func (s *Server) writeCategoryMonths(
	ctx context.Context,
	w http.ResponseWriter,
	from, to time.Time,
	kind string,
) {
	totals, err := s.deps.Analytics.CategoryTotalsByMonth(ctx, from, to, kind)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out := bucketedCategoryAnalyticsResponse{
		From:       from.Format(constant.DateLayout),
		To:         to.Format(constant.DateLayout),
		Kind:       kind,
		Bucket:     "month",
		Categories: make([]categoryMonthsResponse, 0, len(totals)),
	}

	for _, total := range totals {
		months := make([]categoryMonthResponse, 0, len(total.Months))

		for _, month := range total.Months {
			months = append(months, categoryMonthResponse{
				Month:      month.Month,
				SpendMinor: strconv.FormatInt(month.AmountMinor, 10),
			})
		}

		out.Categories = append(out.Categories, categoryMonthsResponse{
			AccountRef:  total.AccountRef,
			AccountName: total.AccountName,
			Months:      months,
		})
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

func writeBucketRollup(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request",
		"bucket and rollup cannot be combined: send bucket=month or rollup=parent, not both")
}
