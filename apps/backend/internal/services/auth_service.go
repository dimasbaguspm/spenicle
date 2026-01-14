package services

import (
	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/dimasbaguspm/spenicle-api/internal/repositories"
)

type AuthService struct {
	ar repositories.AuthRepository
}

func NewAuthService(ar repositories.AuthRepository) AuthService {
	return AuthService{
		ar,
	}
}

func (s AuthService) Login(p models.LoginRequestModel) (models.LoginResponseModel, error) {
	env := configs.NewEnvironment()

	if p.Username != env.AdminUsername && p.Password != env.AdminPassword {
		return models.LoginResponseModel{}, huma.Error401Unauthorized("Invalid credentials")
	}

	return s.ar.Login(p)
}

func (s AuthService) Refresh(p models.RefreshRequestModel) (models.RefreshResponseModel, error) {
	return s.ar.Refresh(p)
}
