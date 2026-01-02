package configs

import (
	"os"

	"github.com/joho/godotenv"
)

const (
	APP_PORT_ENV     = "APP_PORT"
	DATABASE_URL_ENV = "DATABASE_URL"
)

var _ = godotenv.Load()

type Environment struct {
	AppPort     string
	DatabaseURL string
}

func LoadEnvironment() *Environment {
	return &Environment{
		AppPort:     os.Getenv(APP_PORT_ENV),
		DatabaseURL: os.Getenv(DATABASE_URL_ENV),
	}
}
