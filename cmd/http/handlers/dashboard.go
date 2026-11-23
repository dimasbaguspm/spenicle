package handlers

import (
	"net/http"
	"strconv"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

type topCategoryResponse struct {
	AccountRef  string `json:"account_ref"`
	AccountName string `json:"account_name"`
	AmountMinor string `json:"amount_minor"`
}

type dashboardResponse struct {
	BaseCurrency    string               `json:"base_currency"`
	Month           string               `json:"month"`
	SpendMinor      string               `json:"spend_minor"`
	IncomeMinor     string               `json:"income_minor"`
	NetMinor        string               `json:"net_minor"`
	PendingCaptures int                  `json:"pending_captures"`
	TopCategory     *topCategoryResponse `json:"top_category,omitempty"`
}

func (s *server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Dashboard.Get")
	defer endSpan()

	settings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	from, to, windowErr := analyticsWindow(analyticsRangeQuery{})
	if windowErr != nil {
		writeInvalid(w, windowErr)

		return
	}

	months, err := s.deps.Analytics.MonthlyTotals(ctx, from, to)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out := dashboardResponse{
		BaseCurrency: settings.BaseCurrency,
		SpendMinor:   "0",
		IncomeMinor:  "0",
		NetMinor:     "0",
	}

	if len(months) > 0 {
		latest := months[len(months)-1]
		out.Month = latest.Month
		out.SpendMinor = strconv.FormatInt(latest.SpendMinor, 10)
		out.IncomeMinor = strconv.FormatInt(latest.IncomeMinor, 10)
		out.NetMinor = strconv.FormatInt(latest.NetMinor, 10)
	} else {
		out.Month = to.Format(constant.DateLayout)[:7]
	}

	pending, err := s.deps.Analytics.CaptureCount(ctx, constant.CaptureStatusPending)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out.PendingCaptures = pending

	categories, err := s.deps.Analytics.CategoryTotals(ctx, from, to, constant.AccountKindExpense)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	if len(categories) > 0 {
		out.TopCategory = &topCategoryResponse{
			AccountRef:  categories[0].AccountRef,
			AccountName: categories[0].AccountName,
			AmountMinor: strconv.FormatInt(categories[0].AmountMinor, 10),
		}
	}

	httpx.WriteJSON(w, http.StatusOK, out)
}
