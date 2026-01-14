package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/services"
)

type AuthResource struct {
	as services.AuthService
}

func NewAuthResource(as services.AuthService) AuthResource {
	return AuthResource{}
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

func (ar AuthResource) Login(ctx context.Context, input *struct{ Body models.LoginRequestModel }) (*struct{ models.LoginResponseModel }, error) {
	resp, err := ar.as.Login(input.Body)
	if err != nil {
		return nil, err
	}

	return &struct{ models.LoginResponseModel }{
		LoginResponseModel: resp,
	}, nil
}

func (ar AuthResource) Refresh(ctx context.Context, input *struct{ Body models.RefreshRequestModel }) (*struct{ models.RefreshResponseModel }, error) {
	resp, err := ar.as.Refresh(input.Body)
	if err != nil {
		return nil, err
	}

	return &struct{ models.RefreshResponseModel }{
		RefreshResponseModel: resp,
	}, nil
}
