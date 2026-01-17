package clients

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle-tui/internal/common"
	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

type AuthClient struct {
	client  http.Client
	baseURL string
}

func NewAuthClient(baseURL string, client http.Client) AuthClient {
	return AuthClient{
		client:  client,
		baseURL: baseURL,
	}
}

func (ac AuthClient) Login(p models.LoginRequestModel) (models.LoginResponseModel, error) {
	return common.DoHTTPRequest[models.LoginRequestModel, models.LoginResponseModel](&ac.client, http.MethodPost, ac.baseURL+"/auth/login", p)
}

func (ac AuthClient) Refresh(p models.RefreshRequestModel) (models.RefreshResponseModel, error) {
	return common.DoHTTPRequest[models.RefreshRequestModel, models.RefreshResponseModel](&ac.client, http.MethodPost, ac.baseURL+"/auth/refresh", p)
}
