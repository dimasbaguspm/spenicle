package middleware

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle-api/internal/configs"
	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type LoginRequestModel struct {
	Username string `json:"username" minLength:"1" doc:"Admin username"`
	Password string `json:"password" minLength:"1" doc:"Admin password"`
}

type LoginResponseModel struct {
	AccessToken  string `json:"access_token" doc:"Access token valid for 7 days"`
	RefreshToken string `json:"refresh_token" doc:"Refresh token valid for 30 days"`
}

type RefreshRequestModel struct {
	RefreshToken string `json:"refresh_token" minLength:"1" doc:"Refresh token"`
}

type RefreshResponseModel struct {
	AccessToken string `json:"access_token" doc:"New access token valid for 7 days"`
}

// GenerateToken creates access and refresh JWT tokens for valid credentials
func GenerateToken(env *configs.Environment, loginRequest LoginRequestModel) (accessToken, refreshToken string, err error) {
	// Constant-time comparison to prevent timing attacks
	if subtle.ConstantTimeCompare([]byte(loginRequest.Username), []byte(env.AdminUsername)) != 1 ||
		subtle.ConstantTimeCompare([]byte(loginRequest.Password), []byte(env.AdminPassword)) != 1 {
		return "", "", ErrInvalidCredentials
	}

	// Access token: 7 days
	accessClaims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   "access",
	}
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err = accessTokenObj.SignedString([]byte(env.JWTSecret))
	if err != nil {
		return "", "", err
	}

	// Refresh token: 30 days
	refreshClaims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   "refresh",
	}
	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = refreshTokenObj.SignedString([]byte(env.JWTSecret))
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// GenerateAccessToken creates a new access token from a valid refresh token
func GenerateAccessToken(env *configs.Environment, refreshRequest RefreshRequestModel) (string, error) {
	token, err := jwt.Parse(refreshRequest.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(env.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["sub"] != "refresh" {
		return "", errors.New("invalid refresh token")
	}

	// Generate new access token
	accessClaims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   "access",
	}
	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	return accessTokenObj.SignedString([]byte(env.JWTSecret))
}

// RequireAuth validates JWT tokens
func RequireAuth(env *configs.Environment, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		_, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid signing method")
			}
			return []byte(env.JWTSecret), nil
		})

		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
