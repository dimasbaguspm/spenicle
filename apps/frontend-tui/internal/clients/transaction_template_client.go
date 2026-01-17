package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type TransactionTemplateClient struct {
	client  http.Client
	baseURL string
}

func NewTransactionTemplateClient(baseURL string, client http.Client) TransactionTemplateClient {
	return TransactionTemplateClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (ttc TransactionTemplateClient) List(search models.TransactionTemplatesSearchModel) (models.TransactionTemplatesPagedModel, error) {
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
	if search.Name != "" {
		v.Set("name", search.Name)
	}
	if search.Type != "" {
		v.Set("type", search.Type)
	}
	if search.AccountID > 0 {
		v.Set("accountId", strconv.FormatInt(search.AccountID, 10))
	}
	if search.CategoryID > 0 {
		v.Set("categoryId", strconv.FormatInt(search.CategoryID, 10))
	}
	if search.DestinationAccountID > 0 {
		v.Set("destinationAccountId", strconv.FormatInt(search.DestinationAccountID, 10))
	}
	query := v.Encode()
	url := ttc.baseURL + "/transaction-templates"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.TransactionTemplatesPagedModel](&ttc.client, http.MethodGet, url, struct{}{})
}

func (ttc TransactionTemplateClient) Create(req models.CreateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	return common.DoHTTPRequest[models.CreateTransactionTemplateModel, models.TransactionTemplateModel](&ttc.client, http.MethodPost, ttc.baseURL+"/transaction-templates", req)
}

func (ttc TransactionTemplateClient) Get(id int64) (models.TransactionTemplateModel, error) {
	url := ttc.baseURL + "/transaction-templates/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.TransactionTemplateModel](&ttc.client, http.MethodGet, url, struct{}{})
}

func (ttc TransactionTemplateClient) Update(id int64, req models.UpdateTransactionTemplateModel) (models.TransactionTemplateModel, error) {
	url := ttc.baseURL + "/transaction-templates/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateTransactionTemplateModel, models.TransactionTemplateModel](&ttc.client, http.MethodPatch, url, req)
}

func (ttc TransactionTemplateClient) Delete(id int64) error {
	url := ttc.baseURL + "/transaction-templates/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&ttc.client, http.MethodDelete, url, struct{}{})
	return err
}
