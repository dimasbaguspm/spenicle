package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type BudgetTemplateClient struct {
	client  http.Client
	baseURL string
}

func NewBudgetTemplateClient(baseURL string, client http.Client) BudgetTemplateClient {
	return BudgetTemplateClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (btc BudgetTemplateClient) List(search models.BudgetTemplatesSearchModel) (models.BudgetTemplatesPagedModel, error) {
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
	for _, id := range search.AccountIDs {
		v.Add("accountId", strconv.FormatInt(id, 10))
	}
	for _, id := range search.CategoryIDs {
		v.Add("categoryId", strconv.FormatInt(id, 10))
	}
	if search.Recurrence != "" {
		v.Set("recurrence", search.Recurrence)
	}
	query := v.Encode()
	url := btc.baseURL + "/budget-templates"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.BudgetTemplatesPagedModel](&btc.client, http.MethodGet, url, struct{}{})
}

func (btc BudgetTemplateClient) Create(req models.CreateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	return common.DoHTTPRequest[models.CreateBudgetTemplateModel, models.BudgetTemplateModel](&btc.client, http.MethodPost, btc.baseURL+"/budget-templates", req)
}

func (btc BudgetTemplateClient) Get(id int64) (models.BudgetTemplateModel, error) {
	url := btc.baseURL + "/budget-templates/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.BudgetTemplateModel](&btc.client, http.MethodGet, url, struct{}{})
}

func (btc BudgetTemplateClient) Update(id int64, req models.UpdateBudgetTemplateModel) (models.BudgetTemplateModel, error) {
	url := btc.baseURL + "/budget-templates/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateBudgetTemplateModel, models.BudgetTemplateModel](&btc.client, http.MethodPatch, url, req)
}

func (btc BudgetTemplateClient) Delete(id int64) error {
	url := btc.baseURL + "/budget-templates/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&btc.client, http.MethodDelete, url, struct{}{})
	return err
}
