package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/validating"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const dashboardMaxWindowDays = 366

type topCategoryResponse struct {
	AccountRef  string `json:"account_ref"`
	AccountName string `json:"account_name"`
	AmountMinor string `json:"amount_minor"`
}

type dashboardQuery struct {
	From string `query:"from" validate:"required,datestr"`
	To   string `query:"to"   validate:"required,datestr"`
}

func dashboardWindow(query dashboardQuery) (time.Time, time.Time, error) {
	from, err := validating.Day(query.From, "from")
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	to, err := validating.Day(query.To, "to")
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	if to.Before(from) {
		return time.Time{}, time.Time{}, errors.New("from must not be after to")
	}
	if days := int(to.Sub(from).Hours()/24) + 1; days > dashboardMaxWindowDays {
		return time.Time{}, time.Time{}, fmt.Errorf("window must not exceed %d days", dashboardMaxWindowDays)
	}

	return from, to, nil
}

type dashboardResponse struct {
	From            string               `json:"from"`
	To              string               `json:"to"`
	BaseCurrency    string               `json:"base_currency"`
	Month           string               `json:"month"`
	SpendMinor      string               `json:"spend_minor"`
	IncomeMinor     string               `json:"income_minor"`
	NetMinor        string               `json:"net_minor"`
	Months          []monthTotalResponse `json:"months"`
	PendingCaptures int                  `json:"pending_captures"`
	TopCategory     *topCategoryResponse `json:"top_category,omitempty"`
}

func monthTotals(months []entity.MonthTotal) []monthTotalResponse {
	out := make([]monthTotalResponse, 0, len(months))
	for _, month := range months {
		out = append(out, monthTotalResponse{
			Month:       month.Month,
			SpendMinor:  strconv.FormatInt(month.SpendMinor, 10),
			IncomeMinor: strconv.FormatInt(month.IncomeMinor, 10),
			NetMinor:    strconv.FormatInt(month.NetMinor, 10),
		})
	}

	return out
}

func topCategory(categories []entity.CategoryTotal) *topCategoryResponse {
	if len(categories) == 0 {
		return nil
	}

	return &topCategoryResponse{
		AccountRef:  categories[0].AccountRef,
		AccountName: categories[0].AccountName,
		AmountMinor: strconv.FormatInt(categories[0].AmountMinor, 10),
	}
}

func (s *Server) GetDashboard(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Dashboard.Get")
	defer endSpan()

	var query dashboardQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	from, to, err := dashboardWindow(query)
	if err != nil {
		httpx.WriteError(w, http.StatusUnprocessableEntity, "invalid_request", err.Error())

		return
	}

	settings, err := s.deps.Settings.Load(ctx)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	months, err := s.deps.Analytics.MonthlyTotals(ctx, from, to)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out := dashboardResponse{
		From:         from.Format(constant.DateLayout),
		To:           to.Format(constant.DateLayout),
		BaseCurrency: settings.BaseCurrency,
		SpendMinor:   "0",
		IncomeMinor:  "0",
		NetMinor:     "0",
		Months:       monthTotals(months),
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

	pending, err := s.deps.Analytics.CaptureCount(ctx, from, to, constant.CaptureStatusPending)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out.PendingCaptures = pending

	categories, err := s.deps.Analytics.CategoryTotals(ctx, from, to, constant.AccountKindExpense)
	if err != nil {
		s.writeClassified(ctx, w, err)

		return
	}

	out.TopCategory = topCategory(categories)

	httpx.WriteJSON(w, http.StatusOK, out)
}
