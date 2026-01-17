package clients

import (
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type SummaryClient struct {
	client  http.Client
	baseURL string
}

func NewSummaryClient(baseURL string, client http.Client) SummaryClient {
	return SummaryClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (sc SummaryClient) GetAccountsSummary(search models.SummarySearchModel) (models.SummaryAccountListModel, error) {
	v := url.Values{}
	if !search.StartDate.IsZero() {
		v.Set("startDate", search.StartDate.Format(time.RFC3339))
	}
	if !search.EndDate.IsZero() {
		v.Set("endDate", search.EndDate.Format(time.RFC3339))
	}
	query := v.Encode()
	url := sc.baseURL + "/summary/accounts"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.SummaryAccountListModel](&sc.client, http.MethodGet, url, struct{}{})
}

func (sc SummaryClient) GetCategoriesSummary(search models.SummarySearchModel, accountIDs []int64) (models.SummaryCategoryListModel, error) {
	v := url.Values{}
	if !search.StartDate.IsZero() {
		v.Set("startDate", search.StartDate.Format(time.RFC3339))
	}
	if !search.EndDate.IsZero() {
		v.Set("endDate", search.EndDate.Format(time.RFC3339))
	}
	for _, id := range accountIDs {
		v.Add("accountId", strconv.FormatInt(id, 10))
	}
	query := v.Encode()
	url := sc.baseURL + "/summary/categories"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.SummaryCategoryListModel](&sc.client, http.MethodGet, url, struct{}{})
}

func (sc SummaryClient) GetTransactionsSummary(search models.SummaryTransactionSearchModel, accountIDs, categoryIDs, tagIDs []int64) (models.SummaryTransactionListModel, error) {
	v := url.Values{}
	if !search.StartDate.IsZero() {
		v.Set("startDate", search.StartDate.Format(time.RFC3339))
	}
	if !search.EndDate.IsZero() {
		v.Set("endDate", search.EndDate.Format(time.RFC3339))
	}
	if search.Frequency != "" {
		v.Set("frequency", search.Frequency)
	}
	for _, id := range accountIDs {
		v.Add("accountId", strconv.FormatInt(id, 10))
	}
	for _, id := range categoryIDs {
		v.Add("categoryId", strconv.FormatInt(id, 10))
	}
	for _, id := range tagIDs {
		v.Add("tagId", strconv.FormatInt(id, 10))
	}
	query := v.Encode()
	url := sc.baseURL + "/summary/transactions"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.SummaryTransactionListModel](&sc.client, http.MethodGet, url, struct{}{})
}

func (sc SummaryClient) GetBudgetsSummary(search models.SummarySearchModel, accountIDs, categoryIDs, tagIDs []int64) (models.SummaryCategoryListModel, error) {
	v := url.Values{}
	if !search.StartDate.IsZero() {
		v.Set("startDate", search.StartDate.Format(time.RFC3339))
	}
	if !search.EndDate.IsZero() {
		v.Set("endDate", search.EndDate.Format(time.RFC3339))
	}
	for _, id := range accountIDs {
		v.Add("accountId", strconv.FormatInt(id, 10))
	}
	for _, id := range categoryIDs {
		v.Add("categoryId", strconv.FormatInt(id, 10))
	}
	for _, id := range tagIDs {
		v.Add("tagId", strconv.FormatInt(id, 10))
	}
	query := v.Encode()
	url := sc.baseURL + "/summary/budgets"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.SummaryCategoryListModel](&sc.client, http.MethodGet, url, struct{}{})
}
