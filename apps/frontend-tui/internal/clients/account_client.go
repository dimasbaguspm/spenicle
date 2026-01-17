package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type AccountClient struct {
	client  http.Client
	baseURL string
}

func NewAccountClient(baseURL string, client http.Client) AccountClient {
	return AccountClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (ac AccountClient) List(search models.AccountsSearchModel) (models.AccountsPagedModel, error) {
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
	for _, id := range search.ID {
		v.Add("id", strconv.Itoa(id))
	}
	if search.Name != "" {
		v.Set("name", search.Name)
	}
	for _, t := range search.Type {
		v.Add("type", t)
	}
	if search.Archived != "" {
		v.Set("archived", search.Archived)
	}
	query := v.Encode()
	url := ac.baseURL + "/accounts"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.AccountsPagedModel](&ac.client, http.MethodGet, url, struct{}{})
}

func (ac AccountClient) Create(req models.CreateAccountModel) (models.AccountModel, error) {
	return common.DoHTTPRequest[models.CreateAccountModel, models.AccountModel](&ac.client, http.MethodPost, ac.baseURL+"/accounts", req)
}

func (ac AccountClient) Get(id int64) (models.AccountModel, error) {
	url := ac.baseURL + "/accounts/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.AccountModel](&ac.client, http.MethodGet, url, struct{}{})
}

func (ac AccountClient) Update(id int64, req models.UpdateAccountModel) (models.AccountModel, error) {
	url := ac.baseURL + "/accounts/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateAccountModel, models.AccountModel](&ac.client, http.MethodPatch, url, req)
}

func (ac AccountClient) Delete(id int64) error {
	url := ac.baseURL + "/accounts/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&ac.client, http.MethodDelete, url, struct{}{})
	return err
}
