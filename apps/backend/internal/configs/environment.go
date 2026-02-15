package configs

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

const (
	APP_PORT_ENV       = "APP_PORT"
	IS_DEV_ENV         = "IS_DEV_ENV"
	DB_HOST_ENV        = "DB_HOST"
	DB_PORT_ENV        = "DB_PORT"
	DB_USER_ENV        = "DB_USER"
	DB_PASSWORD_ENV    = "DB_PASSWORD"
	DB_NAME_ENV        = "DB_NAME"
	JWT_SECRET_ENV     = "JWT_SECRET"
	ADMIN_USERNAME_ENV = "ADMIN_USERNAME"
	ADMIN_PASSWORD_ENV = "ADMIN_PASSWORD"
	BASE_CURRENCY_ENV  = "BASE_CURRENCY"
)

const (
	AppStageProd = "AppStageProd"
	AppStageDev  = "AppStageDev"
)

var _ = godotenv.Load()

type Environment struct {
	AppPort       string
	AppStage      string
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	DatabaseURL   string
	RedisURL      string
	AdminUsername string
	AdminPassword string
	BaseCurrency  string
}

func NewEnvironment() Environment {
	dbHost := os.Getenv(DB_HOST_ENV)
	dbPort := os.Getenv(DB_PORT_ENV)
	dbUser := os.Getenv(DB_USER_ENV)
	dbPassword := os.Getenv(DB_PASSWORD_ENV)
	dbName := os.Getenv(DB_NAME_ENV)
	databaseURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	redisURL := os.Getenv("REDIS_URL")

	var stage string
	_, isExist := os.LookupEnv(IS_DEV_ENV)
	if isExist {
		stage = AppStageDev
	} else {
		stage = AppStageProd
	}

	baseCurrency := os.Getenv(BASE_CURRENCY_ENV)
	if baseCurrency == "" {
		baseCurrency = DefaultBaseCurrency
	}

	return Environment{
		AppPort:       os.Getenv(APP_PORT_ENV),
		AppStage:      stage,
		DBHost:        dbHost,
		DBPort:        dbPort,
		DBUser:        dbUser,
		DBPassword:    dbPassword,
		DBName:        dbName,
		DatabaseURL:   databaseURL,
		RedisURL:      redisURL,
		AdminUsername: os.Getenv(ADMIN_USERNAME_ENV),
		AdminPassword: os.Getenv(ADMIN_PASSWORD_ENV),
		BaseCurrency:  baseCurrency,
	}
}
