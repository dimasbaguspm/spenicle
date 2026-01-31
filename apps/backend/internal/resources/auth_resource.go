package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type AuthResource struct {
	as services.AuthService
}

func NewAuthResource(as services.AuthService) AuthResource {
	return AuthResource{as}
}
func (ar AuthResource) Routes(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "login",
		Method:      "POST",
		Path:        "/auth/login",
		Summary:     "Login",
		Description: "Authenticate and receive access and refresh tokens",
		Tags:        []string{"Auth"},
	}, ar.Login)
	huma.Register(api, huma.Operation{
		OperationID: "refresh",
		Method:      "POST",
		Path:        "/auth/refresh",
		Summary:     "Refresh token",
		Description: "Get new access token using refresh token",
		Tags:        []string{"Auth"},
	}, ar.Refresh)
}
func (ar AuthResource) Login(ctx context.Context, input *struct{ Body models.LoginRequestModel }) (*struct{ Body models.LoginResponseModel }, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AuthResource.Login")
	logger.Info("start")
	resp, err := ar.as.Login(input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct{ Body models.LoginResponseModel }{
		Body: resp,
	}, nil
}
func (ar AuthResource) Refresh(ctx context.Context, input *struct{ Body models.RefreshRequestModel }) (*struct{ Body models.RefreshResponseModel }, error) {
	logger := middleware.GetLogger(ctx).With("resource", "AuthResource.Refresh")
	logger.Info("start")
	resp, err := ar.as.Refresh(input.Body)
	if err != nil {
		logger.Error("error", "error", err)
		return nil, err
	}
	logger.Info("success")
	return &struct{ Body models.RefreshResponseModel }{
		Body: resp,
	}, nil
}
