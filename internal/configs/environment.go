package configs

import (
	"os"

	"github.com/joho/godotenv"
)

const (
	APP_PORT_ENV       = "APP_PORT"
	DATABASE_URL_ENV   = "DATABASE_URL"
	JWT_SECRET_ENV     = "JWT_SECRET"
	ADMIN_USERNAME_ENV = "ADMIN_USERNAME"
	ADMIN_PASSWORD_ENV = "ADMIN_PASSWORD"
)

var _ = godotenv.Load()

type Environment struct {
	AppPort       string
	DatabaseURL   string
	JWTSecret     string
	AdminUsername string
	AdminPassword string
}

func LoadEnvironment() *Environment {
	return &Environment{
		AppPort:       os.Getenv(APP_PORT_ENV),
		DatabaseURL:   os.Getenv(DATABASE_URL_ENV),
		JWTSecret:     os.Getenv(JWT_SECRET_ENV),
		AdminUsername: os.Getenv(ADMIN_USERNAME_ENV),
		AdminPassword: os.Getenv(ADMIN_PASSWORD_ENV),
	}
}
