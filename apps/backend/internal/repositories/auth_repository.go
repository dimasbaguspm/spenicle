package repositories

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/dimasbaguspm/spenicle-api/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

type AuthRepository struct {
	ctx context.Context
	env configs.Environment
}

func NewAuthRepository(ctx context.Context) AuthRepository {
	env := configs.NewEnvironment()
	return AuthRepository{ctx: ctx, env: env}
}

func (aR AuthRepository) Login(d models.LoginRequestModel) (models.LoginResponseModel, error) {
	if d.Username != aR.env.AdminUsername && d.Password != aR.env.AdminPassword {
		return models.LoginResponseModel{}, huma.Error401Unauthorized("Invalid credentials")
	}

	aTk, err := aR.createToken("access", time.Now().Add(7*24*time.Hour))
	if err != nil {
		return models.LoginResponseModel{}, err
	}

	rTk, err := aR.createToken("refresh", time.Now().Add(30*24*time.Hour))
	if err != nil {
		return models.LoginResponseModel{}, err
	}

	return models.LoginResponseModel{
		AccessToken:  aTk,
		RefreshToken: rTk,
	}, nil
}

func (aR AuthRepository) Refresh(d models.RefreshRequestModel) (models.RefreshResponseModel, error) {
	_, err := aR.ParseToken(d.RefreshToken)
	if err != nil {
		return models.RefreshResponseModel{}, err
	}

	aTk, err := aR.createToken("access", time.Now().Add(7*24*time.Hour))
	if err != nil {
		return models.RefreshResponseModel{}, err
	}

	return models.RefreshResponseModel{
		AccessToken: aTk,
	}, nil

}

func (aR AuthRepository) createToken(sub string, time time.Time) (string, error) {
	tokenClaims := jwt.MapClaims{
		"exp":      jwt.NewNumericDate(time),
		"iat":      jwt.NewNumericDate(time),
		"sub":      sub,
		"username": aR.env.AdminUsername,
	}
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)
	return accessTokenObj.SignedString([]byte(aR.env.JWTSecret))
}

func (aR AuthRepository) ParseToken(tk string) (bool, error) {
	token, err := jwt.Parse(tk, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, huma.Error401Unauthorized("Invalid sign in method")
		}
		return []byte(aR.env.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return false, huma.Error400BadRequest("Invalid or expired token")
	}

	return true, nil
}
