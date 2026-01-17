package clients

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type TransactionClient struct {
	client  http.Client
	baseURL string
}

func NewTransactionClient(baseURL string, client http.Client) TransactionClient {
	return TransactionClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (tc TransactionClient) List(search models.TransactionsSearchModel) (models.TransactionsPagedModel, error) {
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
		v.Add("id", strconv.Itoa(id))
	}
	for _, t := range search.Type {
		v.Add("type", t)
	}
	for _, id := range search.AccountIDs {
		v.Add("accountId", strconv.Itoa(id))
	}
	for _, id := range search.CategoryIDs {
		v.Add("categoryId", strconv.Itoa(id))
	}
	for _, id := range search.DestinationAccountIDs {
		v.Add("destinationAccountId", strconv.Itoa(id))
	}
	for _, id := range search.TagIDs {
		v.Add("tagId", strconv.Itoa(id))
	}
	if search.StartDate != "" {
		v.Set("startDate", search.StartDate)
	}
	if search.EndDate != "" {
		v.Set("endDate", search.EndDate)
	}
	if search.MinAmount > 0 {
		v.Set("minAmount", strconv.FormatInt(search.MinAmount, 10))
	}
	if search.MaxAmount > 0 {
		v.Set("maxAmount", strconv.FormatInt(search.MaxAmount, 10))
	}
	query := v.Encode()
	url := tc.baseURL + "/transactions"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.TransactionsPagedModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) Create(req models.CreateTransactionModel) (models.TransactionModel, error) {
	return common.DoHTTPRequest[models.CreateTransactionModel, models.TransactionModel](&tc.client, http.MethodPost, tc.baseURL+"/transactions", req)
}

func (tc TransactionClient) Get(id int64) (models.TransactionModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[struct{}, models.TransactionModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) Update(id int64, req models.UpdateTransactionModel) (models.TransactionModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(id, 10)
	return common.DoHTTPRequest[models.UpdateTransactionModel, models.TransactionModel](&tc.client, http.MethodPatch, url, req)
}

func (tc TransactionClient) Delete(id int64) error {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(id, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&tc.client, http.MethodDelete, url, struct{}{})
	return err
}

// Relations
func (tc TransactionClient) ListRelations(sourceTransactionID int64, search models.TransactionRelationsSearchModel) (models.TransactionRelationsPagedModel, error) {
	v := url.Values{}
	if search.PageNumber > 0 {
		v.Set("pageNumber", strconv.Itoa(search.PageNumber))
	}
	if search.PageSize > 0 {
		v.Set("pageSize", strconv.Itoa(search.PageSize))
	}
	query := v.Encode()
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(sourceTransactionID, 10) + "/relations"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.TransactionRelationsPagedModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) CreateRelation(sourceTransactionID int64, req models.CreateTransactionRelationModel) (models.TransactionRelationModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(sourceTransactionID, 10) + "/relations"
	return common.DoHTTPRequest[models.CreateTransactionRelationModel, models.TransactionRelationModel](&tc.client, http.MethodPost, url, req)
}

func (tc TransactionClient) GetRelation(sourceTransactionID, relationID int64) (models.TransactionRelationModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(sourceTransactionID, 10) + "/relations/" + strconv.FormatInt(relationID, 10)
	return common.DoHTTPRequest[struct{}, models.TransactionRelationModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) DeleteRelation(sourceTransactionID, relationID int64) error {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(sourceTransactionID, 10) + "/relations/" + strconv.FormatInt(relationID, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&tc.client, http.MethodDelete, url, struct{}{})
	return err
}

// Tags
func (tc TransactionClient) ListTags(transactionID int64, search models.TransactionTagsSearchModel) (models.TransactionTagsPagedModel, error) {
	v := url.Values{}
	if search.PageNumber > 0 {
		v.Set("pageNumber", strconv.Itoa(search.PageNumber))
	}
	if search.PageSize > 0 {
		v.Set("pageSize", strconv.Itoa(search.PageSize))
	}
	query := v.Encode()
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(transactionID, 10) + "/tags"
	if query != "" {
		url += "?" + query
	}
	return common.DoHTTPRequest[struct{}, models.TransactionTagsPagedModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) AddTag(transactionID int64, req models.CreateTransactionTagModel) (models.TransactionTagModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(transactionID, 10) + "/tags"
	return common.DoHTTPRequest[models.CreateTransactionTagModel, models.TransactionTagModel](&tc.client, http.MethodPost, url, req)
}

func (tc TransactionClient) GetTag(transactionID, tagID int64) (models.TransactionTagModel, error) {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(transactionID, 10) + "/tags/" + strconv.FormatInt(tagID, 10)
	return common.DoHTTPRequest[struct{}, models.TransactionTagModel](&tc.client, http.MethodGet, url, struct{}{})
}

func (tc TransactionClient) RemoveTag(transactionID, tagID int64) error {
	url := tc.baseURL + "/transactions/" + strconv.FormatInt(transactionID, 10) + "/tags/" + strconv.FormatInt(tagID, 10)
	_, err := common.DoHTTPRequest[struct{}, struct{}](&tc.client, http.MethodDelete, url, struct{}{})
	return err
}
