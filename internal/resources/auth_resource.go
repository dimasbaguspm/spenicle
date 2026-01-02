package resources

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/middleware"
)

type AuthResource struct {
	env *configs.Environment
}

func NewAuthResource(env *configs.Environment) *AuthResource {
	return &AuthResource{env: env}
}

type loginRequestBody struct {
	Body middleware.LoginRequestModel
}

type loginResponseBody struct {
	Body middleware.LoginResponseModel
}

type refreshRequestBody struct {
	Body middleware.RefreshRequestModel
}

type refreshResponseBody struct {
	Body middleware.RefreshResponseModel
}

func (ar *AuthResource) RegisterRoutes(api huma.API) {
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

func (ar *AuthResource) Login(ctx context.Context, input *loginRequestBody) (*loginResponseBody, error) {
	accessToken, refreshToken, err := middleware.GenerateToken(ar.env, input.Body)
	if err != nil {
		return nil, huma.Error401Unauthorized("invalid credentials")
	}

	resp := &loginResponseBody{}
	resp.Body.AccessToken = accessToken
	resp.Body.RefreshToken = refreshToken
	return resp, nil
}

func (ar *AuthResource) Refresh(ctx context.Context, input *refreshRequestBody) (*refreshResponseBody, error) {
	accessToken, err := middleware.GenerateAccessToken(ar.env, input.Body)
	if err != nil {
		return nil, huma.Error401Unauthorized("invalid refresh token")
	}

	resp := &refreshResponseBody{}
	resp.Body.AccessToken = accessToken
	return resp, nil
}
