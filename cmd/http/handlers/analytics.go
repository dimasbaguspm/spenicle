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
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const analyticsWindowMonths = 12

type analyticsRangeQuery struct {
	From string `query:"from" validate:"omitempty,momentstr"`
	To   string `query:"to"   validate:"omitempty,momentstr"`
}

type monthTotalResponse struct {
	Month       string `json:"month"`
	SpendMinor  string `json:"spend_minor"  pattern:"^[+-]?[0-9]+$"`
	IncomeMinor string `json:"income_minor" pattern:"^[+-]?[0-9]+$"`
	NetMinor    string `json:"net_minor"    pattern:"^[+-]?[0-9]+$"`
}

type monthlyAnalyticsResponse struct {
	From   string               `format:"date" json:"from"`
	To     string               `format:"date" json:"to"`
	Months []monthTotalResponse `json:"months"`
}

// @Summary     Spend and income per calendar month
// @Description Every month in the window is present, including the empty ones. Money is minor units as strings.
// @Tags        analytics
// @Produce     json
// @Param       from query string false "window start, RFC3339 or date"
// @Param       to query string false "window end"
// @Success     200 {object} monthlyAnalyticsResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/analytics/months [get]
func (s *Server) MonthlyAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Months")
	defer endSpan()

	var query analyticsRangeQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(query, s.location)
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

func analyticsWindow(query analyticsRangeQuery, loc *time.Location) (time.Time, time.Time, error) {
	now := time.Now().In(loc)

	to := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	if query.To != "" {
		parsed, err := validating.MomentEnd(query.To, "to", loc)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}

		to = parsed
	}

	from := time.Date(to.Year(), to.Month()-(analyticsWindowMonths-1), 1, 0, 0, 0, 0, loc)

	if query.From != "" {
		parsed, err := validating.Moment(query.From, "from", loc)
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
	From   string `query:"from"   validate:"omitempty,momentstr"`
	To     string `query:"to"     validate:"omitempty,momentstr"`
	Kind   string `query:"kind"   validate:"omitempty,oneof=expense income"`
	Rollup string `query:"rollup" validate:"omitempty,oneof=parent"`
	Bucket string `query:"bucket" validate:"omitempty,oneof=month"`
}

type categoryTotalResponse struct {
	AccountRef      string `json:"account_ref"  pattern:"^[0-9a-f]{32}$"`
	AccountName     string `json:"account_name"`
	AmountMinor     string `json:"amount_minor" pattern:"^[+-]?[0-9]+$"`
	FirstOccurredOn string `format:"date"       json:"first_occurred_on,omitempty"`
	LastOccurredOn  string `format:"date"       json:"last_occurred_on,omitempty"`
}

type categoryAnalyticsResponse struct {
	From       string                  `format:"date"     json:"from"`
	To         string                  `format:"date"     json:"to"`
	Kind       string                  `json:"kind"`
	Categories []categoryTotalResponse `json:"categories"`
}

type categoryMonthResponse struct {
	Month      string `json:"month"`
	SpendMinor string `json:"spend_minor" pattern:"^[+-]?[0-9]+$"`
}

type categoryMonthsResponse struct {
	AccountRef  string                  `json:"account_ref"  pattern:"^[0-9a-f]{32}$"`
	AccountName string                  `json:"account_name"`
	Months      []categoryMonthResponse `json:"months"`
}

type bucketedCategoryAnalyticsResponse struct {
	From       string                   `format:"date"     json:"from"`
	To         string                   `format:"date"     json:"to"`
	Kind       string                   `json:"kind"`
	Bucket     string                   `json:"bucket"`
	Categories []categoryMonthsResponse `json:"categories"`
}

// @Summary     Spend per category for a range
// @Description `rollup=parent` rolls a child category into its parent. `bucket=month` answers `bucketedCategoryAnalyticsResponse` instead, one series per category.
// @Tags        analytics
// @Produce     json
// @Param       from query string false "window start"
// @Param       to query string false "window end"
// @Param       kind query string false "expense or income"
// @Param       rollup query string false "parent to roll children up"
// @Param       bucket query string false "month for a per-month series"
// @Success     200 {object} categoryAnalyticsResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/analytics/categories [get]
func (s *Server) CategoryAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Categories")
	defer endSpan()

	var query categoryAnalyticsQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(analyticsRangeQuery{From: query.From, To: query.To}, s.location)
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

type payeeTotalResponse struct {
	PayeeRef    string `json:"payee_ref,omitempty"  pattern:"^[0-9a-f]{32}$"`
	PayeeName   string `json:"payee_name,omitempty"`
	AmountMinor string `json:"amount_minor"         pattern:"^[+-]?[0-9]+$"`
}

type accountFlowResponse struct {
	AccountRef   string `json:"account_ref"   pattern:"^[0-9a-f]{32}$"`
	AccountName  string `json:"account_name"`
	Kind         string `json:"kind"`
	InflowMinor  string `json:"inflow_minor"  pattern:"^[+-]?[0-9]+$"`
	OutflowMinor string `json:"outflow_minor" pattern:"^[+-]?[0-9]+$"`
	NetMinor     string `json:"net_minor"     pattern:"^[+-]?[0-9]+$"`
}

type analyticsStatsResponse struct {
	Entries           int    `json:"entries"`
	BusiestOn         string `format:"date"                        json:"busiest_on,omitempty"`
	BusiestSpendMinor string `json:"busiest_spend_minor,omitempty" pattern:"^[+-]?[0-9]+$"`
}

type analyticsOverviewResponse struct {
	From       string                  `format:"date"     json:"from"`
	To         string                  `format:"date"     json:"to"`
	Months     []monthTotalResponse    `json:"months"`
	Categories []categoryTotalResponse `json:"categories"`
	Payees     []payeeTotalResponse    `json:"payees"`
	Accounts   []accountFlowResponse   `json:"accounts"`
	Stats      analyticsStatsResponse  `json:"stats"`

	IncomeCategories []categoryTotalResponse `json:"income_categories"`
	IncomePayees     []payeeTotalResponse    `json:"income_payees"`
}

// @Summary     The whole brief in one read
// @Description Twelve months in one round trip: the month series, the category roots and payees on both sides of the ledger, the money accounts and two stats. Every part is also readable route by route; this is the one call the screen makes.
// @Tags        analytics
// @Produce     json
// @Param       from query string false "window start, RFC3339 or date"
// @Param       to query string false "window end"
// @Success     200 {object} analyticsOverviewResponse
// @Failure     401 {object} httpx.ErrorBody
// @Failure     403 {object} httpx.ErrorBody
// @Failure     422 {object} httpx.ErrorBody
// @Failure     500 {object} httpx.ErrorBody
// @Router      /api/analytics/overview [get]
func (s *Server) OverviewAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.Overview")
	defer endSpan()

	var query analyticsRangeQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := analyticsWindow(query, s.location)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, codeInvalidInput, err.Error())

		return
	}

	out, err := s.overviewOf(ctx, from, to)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}

// overviewBlocks is what the five reads hand the builder: one per question, no request in sight.
type overviewBlocks struct {
	months       []entity.MonthTotal
	roots        []entity.CategoryTotal
	payees       []entity.PayeeTotal
	flows        []entity.AccountFlow
	stats        entity.LedgerStats
	incomeRoots  []entity.CategoryTotal
	incomePayees []entity.PayeeTotal
}

// overviewOf loads every block; the handler above owns the request, this owns the reads.
func (s *Server) overviewOf(
	ctx context.Context,
	from, to time.Time,
) (analyticsOverviewResponse, error) {
	var blocks overviewBlocks

	var err error

	if blocks.months, err = s.deps.Analytics.MonthlyTotals(ctx, from, to); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.roots, err = s.deps.Analytics.CategoryTotalsByRoot(
		ctx, from, to, constant.AccountKindExpense,
	); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.incomeRoots, err = s.deps.Analytics.CategoryTotalsByRoot(
		ctx, from, to, constant.AccountKindIncome,
	); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.payees, err = s.deps.Analytics.PayeeTotals(
		ctx, from, to, constant.AccountKindExpense,
	); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.incomePayees, err = s.deps.Analytics.PayeeTotals(
		ctx, from, to, constant.AccountKindIncome,
	); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.flows, err = s.deps.Analytics.AccountFlows(ctx, from, to); err != nil {
		return analyticsOverviewResponse{}, err
	}

	if blocks.stats, err = s.deps.Analytics.LedgerStats(ctx, from, to); err != nil {
		return analyticsOverviewResponse{}, err
	}

	return newOverviewResponse(from, to, blocks), nil
}

func newOverviewResponse(
	from, to time.Time,
	blocks overviewBlocks,
) analyticsOverviewResponse {
	out := analyticsOverviewResponse{
		From:             from.Format(constant.DateLayout),
		To:               to.Format(constant.DateLayout),
		Months:           make([]monthTotalResponse, 0, len(blocks.months)),
		Categories:       make([]categoryTotalResponse, 0, len(blocks.roots)),
		Payees:           make([]payeeTotalResponse, 0, len(blocks.payees)),
		Accounts:         make([]accountFlowResponse, 0, len(blocks.flows)),
		IncomeCategories: make([]categoryTotalResponse, 0, len(blocks.incomeRoots)),
		IncomePayees:     make([]payeeTotalResponse, 0, len(blocks.incomePayees)),
		Stats:            analyticsStatsResponse{Entries: blocks.stats.Entries},
	}

	if blocks.stats.BusiestOn != "" {
		out.Stats.BusiestOn = blocks.stats.BusiestOn
		out.Stats.BusiestSpendMinor = strconv.FormatInt(blocks.stats.BusiestSpend, 10)
	}

	for _, total := range blocks.months {
		out.Months = append(out.Months, monthTotalResponse{
			Month:       total.Month,
			SpendMinor:  strconv.FormatInt(total.SpendMinor, 10),
			IncomeMinor: strconv.FormatInt(total.IncomeMinor, 10),
			NetMinor:    strconv.FormatInt(total.NetMinor, 10),
		})
	}

	out.Categories = categoryRows(blocks.roots, 1)
	out.IncomeCategories = categoryRows(blocks.incomeRoots, -1)
	out.Payees = payeeRows(blocks.payees, 1)
	out.IncomePayees = payeeRows(blocks.incomePayees, -1)

	for _, flow := range blocks.flows {
		out.Accounts = append(out.Accounts, accountFlowResponse{
			AccountRef:   flow.AccountRef,
			AccountName:  flow.AccountName,
			Kind:         flow.Kind,
			InflowMinor:  strconv.FormatInt(flow.InflowMinor, 10),
			OutflowMinor: strconv.FormatInt(flow.OutflowMinor, 10),
			NetMinor:     strconv.FormatInt(flow.NetMinor, 10),
		})
	}

	return out
}

// categoryRows spells a category total for the wire. The sign says which side of the ledger it is
// on: spend keeps the debit sign the store returns, income is negated into the magnitude a person
// means when they say they were paid.
func categoryRows(totals []entity.CategoryTotal, sign int64) []categoryTotalResponse {
	rows := make([]categoryTotalResponse, 0, len(totals))

	for _, total := range totals {
		rows = append(rows, categoryTotalResponse{
			AccountRef:      total.AccountRef,
			AccountName:     total.AccountName,
			AmountMinor:     strconv.FormatInt(sign*total.AmountMinor, 10),
			FirstOccurredOn: total.FirstOccurredOn,
			LastOccurredOn:  total.LastOccurredOn,
		})
	}

	return rows
}

func payeeRows(totals []entity.PayeeTotal, sign int64) []payeeTotalResponse {
	rows := make([]payeeTotalResponse, 0, len(totals))

	for _, total := range totals {
		rows = append(rows, payeeTotalResponse{
			PayeeRef:    total.PayeeRef,
			PayeeName:   total.PayeeName,
			AmountMinor: strconv.FormatInt(sign*total.AmountMinor, 10),
		})
	}

	return rows
}
