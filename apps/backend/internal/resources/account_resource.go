package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type AccountResource struct {
	as services.AccountService
}

func NewAccountResource(as services.AccountService) AccountResource {
	return AccountResource{as}
}

func (ar AccountResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-accounts",
		Method:      "GET",
		Path:        "/accounts",
		Summary:     "List accounts",
		Description: "Get a paginated list of accounts with optional search",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.List)

	huma.Register(api, huma.Operation{
		OperationID: "create-account",
		Method:      "POST",
		Path:        "/accounts",
		Summary:     "Create account",
		Description: "Create a new account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-account",
		Method:      "GET",
		Path:        "/accounts/{id}",
		Summary:     "Get account",
		Description: "Get a single account by ID",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Get)

	huma.Register(api, huma.Operation{
		OperationID: "update-account",
		Method:      "PATCH",
		Path:        "/accounts/{id}",
		Summary:     "Update account",
		Description: "Update an existing account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Update)

	huma.Register(api, huma.Operation{
		OperationID: "delete-account",
		Method:      "DELETE",
		Path:        "/accounts/{id}",
		Summary:     "Delete account",
		Description: "Delete an account",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Delete)

	huma.Register(api, huma.Operation{
		OperationID: "reorder-accounts",
		Method:      "POST",
		Path:        "/accounts/reorder",
		Summary:     "Reorder accounts",
		Description: "Update display order for multiple accounts",
		Tags:        []string{"Accounts"},
		Security: []map[string][]string{
			{"bearer": {}},
		},
	}, ar.Reorder)
}

func (ar AccountResource) List(ctx context.Context, input *struct {
	models.AccountsSearchModel
}) (*struct {
	Body models.AccountsPagedModel
}, error) {
	resp, err := ar.as.GetPaged(ctx, input.AccountsSearchModel)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.AccountsPagedModel
	}{
		Body: resp,
	}, nil
}

func (ar AccountResource) Get(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
}) (*struct {
	Body models.AccountModel
}, error) {
	resp, err := ar.as.GetDetail(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.AccountModel
	}{
		Body: resp,
	}, nil
}

func (ar AccountResource) Create(ctx context.Context, input *struct {
	Body models.CreateAccountModel
}) (*struct {
	Body models.AccountModel
}, error) {
	resp, err := ar.as.Create(ctx, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.AccountModel
	}{
		Body: resp,
	}, nil
}

func (ar AccountResource) Update(ctx context.Context, input *struct {
	ID   int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
	Body models.UpdateAccountModel
}) (*struct {
	Body models.AccountModel
}, error) {
	resp, err := ar.as.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, err
	}

	return &struct {
		Body models.AccountModel
	}{
		Body: resp,
	}, nil
}

func (ar AccountResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
}) (*struct{}, error) {
	err := ar.as.Delete(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return nil, nil
}

func (ar AccountResource) Reorder(ctx context.Context, input *struct {
	Body models.ReorderAccountsRequestModel
}) (*struct{}, error) {
	err := ar.as.Reorder(ctx, input.Body.Data)
	if err != nil {
		return nil, err
	}

	return &struct{}{}, nil
}
