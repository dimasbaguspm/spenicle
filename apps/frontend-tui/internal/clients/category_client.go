package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type CategoryClient struct {
	client  http.Client
	baseURL string
}

func NewCategoryClient(baseURL string, client http.Client) CategoryClient {
	return CategoryClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (cc CategoryClient) List(search models.CategoriesSearchModel) (models.CategoriesPagedModel, error) {
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
	url := cc.baseURL + "/categories"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.CategoriesPagedModel](&cc.client, http.MethodGet, url, struct{}{})
}

func (cc CategoryClient) Create(req models.CreateCategoryModel) (models.CategoryModel, error) {
	return common.DoHTTPRequest[models.CreateCategoryModel, models.CategoryModel](&cc.client, http.MethodPost, cc.baseURL+"/categories", req)
}

func (cc CategoryClient) Get(id int64) (models.CategoryModel, error) {
	url := cc.baseURL + "/categories/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.CategoryModel](&cc.client, http.MethodGet, url, struct{}{})
}

func (cc CategoryClient) Update(id int64, req models.UpdateCategoryModel) (models.CategoryModel, error) {
	url := cc.baseURL + "/categories/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateCategoryModel, models.CategoryModel](&cc.client, http.MethodPatch, url, req)
}

func (cc CategoryClient) Delete(id int64) error {
	url := cc.baseURL + "/categories/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&cc.client, http.MethodDelete, url, struct{}{})
	return err
}
