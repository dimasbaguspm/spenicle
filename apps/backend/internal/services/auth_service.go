package services

import (
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

func (ar AuthService) Login(p models.LoginRequestModel) (models.LoginResponseModel, error) {
	return ar.Login(p)
}

func (ar AuthService) Refresh(p models.RefreshRequestModel) (models.RefreshResponseModel, error) {
	return ar.Refresh(p)
}
