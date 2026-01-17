package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type BudgetClient struct {
	client  http.Client
	baseURL string
}

func NewBudgetClient(baseURL string, client http.Client) BudgetClient {
	return BudgetClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (bc BudgetClient) List(search models.BudgetsSearchModel) (models.BudgetsPagedModel, error) {
	v := url.Values{}
	if search.PageNumber > 0 {
		v.Set("pageNumber", strconv.Itoa(search.PageNumber))
	}
	if search.PageSize > 0 {
		v.Set("pageSize", strconv.Itoa(search.PageSize))
	}
	if search.SortBy != "" {
		v.Set("sortBy", search.SortBy)
	}
	if search.SortOrder != "" {
		v.Set("sortOrder", search.SortOrder)
	}
	for _, id := range search.IDs {
		v.Add("id", strconv.FormatInt(id, 10))
	}
	for _, id := range search.TemplateIDs {
		v.Add("templateId", strconv.FormatInt(id, 10))
	}
	for _, id := range search.AccountIDs {
		v.Add("accountId", strconv.FormatInt(id, 10))
	}
	for _, id := range search.CategoryIDs {
		v.Add("categoryId", strconv.FormatInt(id, 10))
	}
	query := v.Encode()
	url := bc.baseURL + "/budgets"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.BudgetsPagedModel](&bc.client, http.MethodGet, url, struct{}{})
}

func (bc BudgetClient) Create(req models.CreateBudgetModel) (models.BudgetModel, error) {
	return common.DoHTTPRequest[models.CreateBudgetModel, models.BudgetModel](&bc.client, http.MethodPost, bc.baseURL+"/budgets", req)
}

func (bc BudgetClient) Get(id int64) (models.BudgetModel, error) {
	url := bc.baseURL + "/budgets/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.BudgetModel](&bc.client, http.MethodGet, url, struct{}{})
}

func (bc BudgetClient) Update(id int64, req models.UpdateBudgetModel) (models.BudgetModel, error) {
	url := bc.baseURL + "/budgets/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateBudgetModel, models.BudgetModel](&bc.client, http.MethodPatch, url, req)
}

func (bc BudgetClient) Delete(id int64) error {
	url := bc.baseURL + "/budgets/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&bc.client, http.MethodDelete, url, struct{}{})
	return err
}
