package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type TagClient struct {
	client  http.Client
	baseURL string
}

func NewTagClient(baseURL string, client http.Client) TagClient {
	return TagClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (tc TagClient) List(search models.TagsSearchModel) (models.TagsPagedModel, error) {
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
	query := v.Encode()
	url := tc.baseURL + "/tags"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.TagsPagedModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TagClient) Create(req models.CreateTagModel) (models.TagModel, error) {
	return common.DoHTTPRequest[models.CreateTagModel, models.TagModel](&tc.client, http.MethodPost, tc.baseURL+"/tags", req)
}

func (tc TagClient) Get(id int64) (models.TagModel, error) {
	url := tc.baseURL + "/tags/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.TagModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TagClient) Update(id int64, req models.UpdateTagModel) (models.TagModel, error) {
	url := tc.baseURL + "/tags/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateTagModel, models.TagModel](&tc.client, http.MethodPatch, url, req)
}

func (tc TagClient) Delete(id int64) error {
	url := tc.baseURL + "/tags/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&tc.client, http.MethodDelete, url, struct{}{})
	return err
}
