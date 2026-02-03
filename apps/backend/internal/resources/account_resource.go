package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/observability"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type AccountResource struct {
	sevs services.RootService
}

func NewAccountResource(sevs services.RootService) AccountResource {
	return AccountResource{sevs}
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
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.List")
	logger.Info("start")
	resp, err := ar.sevs.Acc.GetPaged(ctx, input.AccountsSearchModel)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success", "count", len(resp.Items))
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
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.Get", "account_id", input.ID)
	logger.Info("start")
	resp, err := ar.sevs.Acc.GetDetail(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
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
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.Create", "name", input.Body.Name)
	logger.Info("start")
	resp, err := ar.sevs.Acc.Create(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success", "account_id", resp.ID)
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
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.Update", "account_id", input.ID)
	logger.Info("start")
	resp, err := ar.sevs.Acc.Update(ctx, input.ID, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct {
		Body models.AccountModel
	}{
		Body: resp,
	}, nil
}
func (ar AccountResource) Delete(ctx context.Context, input *struct {
	ID int64 `path:"id" minimum:"1" doc:"Unique identifier of the account" example:"1"`
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.Delete", "account_id", input.ID)
	logger.Info("start")
	err := ar.sevs.Acc.Delete(ctx, input.ID)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return nil, nil
}
func (ar AccountResource) Reorder(ctx context.Context, input *struct {
	Body models.ReorderAccountsModel
}) (*struct{}, error) {
	logger := observability.GetLogger(ctx).With("resource", "AccountResource.Reorder")
	logger.Info("start")
	err := ar.sevs.Acc.Reorder(ctx, input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct{}{}, nil
}
