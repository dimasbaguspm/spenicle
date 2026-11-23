package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type customQueryCreateRequest struct {
	Name      string `json:"name"      validate:"required,max=80"`
	Namespace string `json:"namespace" validate:"required,oneof=months categories"`
	Chart     string `json:"chart"     validate:"required,oneof=bar line pie"`
}

type customQueryPatchRequest struct {
	Name  *string `json:"name,omitempty"  validate:"omitempty,max=80"`
	Chart *string `json:"chart,omitempty" validate:"omitempty,oneof=bar line pie"`
}

type customQueryResponse struct {
	Ref       string `json:"ref"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Chart     string `json:"chart"`
	CreatedAt string `json:"created_at"`
}

func (s *server) handleCreateCustomQuery(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.CreateCustom")
	defer endSpan()

	var request customQueryCreateRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	created, err := s.deps.CustomQueries.CreateCustomQuery(ctx, entity.CustomQuery{
		Name:      request.Name,
		Namespace: request.Namespace,
		Chart:     request.Chart,
	})
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusCreated, toCustomQueryResponse(created))
}

func (s *server) handlePatchCustomQuery(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.PatchCustom")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var request customQueryPatchRequest
	if !bindBody(w, r, s.deps.MaxBodyBytes, &request) {
		return
	}

	query, found, err := s.deps.CustomQueries.CustomQueryByRef(ctx, path.Ref)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no saved query "+path.Ref)

		return
	}

	if request.Name != nil {
		query.Name = *request.Name
	}

	if request.Chart != nil {
		query.Chart = *request.Chart
	}

	updated, err := s.deps.CustomQueries.UpdateCustomQuery(ctx, query)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, toCustomQueryResponse(updated))
}

type customQueryRunResponse struct {
	Query      customQueryResponse     `json:"query"`
	From       string                  `json:"from"`
	To         string                  `json:"to"`
	Months     []monthTotalResponse    `json:"months,omitempty"`
	Categories []categoryTotalResponse `json:"categories,omitempty"`
}

func (s *server) handleRunCustomQuery(w http.ResponseWriter, r *http.Request) {
	ctx, endSpan := telemetry.StartSpan(r.Context(), "Handler.Analytics.RunCustom")
	defer endSpan()

	var path pathRefRequest
	if err := bindPath(r, &path); err != nil {
		writeInvalid(w, err)

		return
	}

	var query analyticsRangeQuery
	if err := bindQuery(r, &query); err != nil {
		writeInvalid(w, err)

		return
	}

	saved, found, err := s.deps.CustomQueries.CustomQueryByRef(ctx, path.Ref)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	if !found {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "no saved query "+path.Ref)

		return
	}

	from, to, err := analyticsWindow(query)
	if err != nil {
		writeInvalid(w, err)

		return
	}

	out := customQueryRunResponse{
		Query: toCustomQueryResponse(saved),
		From:  from.Format(constant.DateLayout),
		To:    to.Format(constant.DateLayout),
	}

	months, categories, err := s.runNamespace(ctx, saved.Namespace, from, to)
	if err != nil {
		status, code := classify(err)
		httpx.WriteError(w, status, code, err.Error())

		return
	}

	out.Months = months
	out.Categories = categories

	httpx.WriteJSON(w, http.StatusOK, out)
}

func toCustomQueryResponse(query entity.CustomQuery) customQueryResponse {
	return customQueryResponse{
		Ref:       query.Ref,
		Name:      query.Name,
		Namespace: query.Namespace,
		Chart:     query.Chart,
		CreatedAt: query.CreatedAt.Format(constant.TimestampLayout),
	}
}

func (s *server) runNamespace(
	ctx context.Context,
	namespace string,
	from, to time.Time,
) ([]monthTotalResponse, []categoryTotalResponse, error) {
	if namespace == "months" {
		totals, err := s.deps.Analytics.MonthlyTotals(ctx, from, to)
		if err != nil {
			return nil, nil, err
		}

		months := make([]monthTotalResponse, 0, len(totals))

		for _, total := range totals {
			months = append(months, monthTotalResponse{
				Month:       total.Month,
				SpendMinor:  strconv.FormatInt(total.SpendMinor, 10),
				IncomeMinor: strconv.FormatInt(total.IncomeMinor, 10),
				NetMinor:    strconv.FormatInt(total.NetMinor, 10),
			})
		}

		return months, nil, nil
	}

	totals, err := s.deps.Analytics.CategoryTotals(ctx, from, to, "expense")
	if err != nil {
		return nil, nil, err
	}

	categories := make([]categoryTotalResponse, 0, len(totals))

	for _, total := range totals {
		categories = append(categories, categoryTotalResponse{
			AccountRef:  total.AccountRef,
			AccountName: total.AccountName,
			AmountMinor: strconv.FormatInt(total.AmountMinor, 10),
		})
	}

	return nil, categories, nil
}
