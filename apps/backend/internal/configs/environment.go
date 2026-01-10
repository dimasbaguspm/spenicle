package configs

import (
	"errors"
	"fmt"
	"os"
	"strings"

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
)

const (
	AppStageProd = "AppStageProd"
	AppStageDev  = "AppStageDev"
)

const (
	// Minimum JWT secret length for security (256 bits = 32 bytes)
	MinJWTSecretLength = 32
	// Minimum password length
	MinPasswordLength = 8
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
	DatabaseURL   string // Built from individual DB fields
	JWTSecret     string
	AdminUsername string
	AdminPassword string
}

// LoadEnvironment loads and returns environment configuration
func LoadEnvironment() *Environment {
	dbHost := os.Getenv(DB_HOST_ENV)
	dbPort := os.Getenv(DB_PORT_ENV)
	dbUser := os.Getenv(DB_USER_ENV)
	dbPassword := os.Getenv(DB_PASSWORD_ENV)
	dbName := os.Getenv(DB_NAME_ENV)

	// Build DATABASE_URL from individual components
	var databaseURL string
	if dbHost != "" && dbPort != "" && dbUser != "" && dbPassword != "" && dbName != "" {
		databaseURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			dbUser, dbPassword, dbHost, dbPort, dbName)
	}

	var stage string
	_, isExist := os.LookupEnv(IS_DEV_ENV)
	if isExist {
		stage = AppStageDev
	} else {
		stage = AppStageProd
	}

	return &Environment{
		AppPort:       os.Getenv(APP_PORT_ENV),
		AppStage:      stage,
		DBHost:        dbHost,
		DBPort:        dbPort,
		DBUser:        dbUser,
		DBPassword:    dbPassword,
		DBName:        dbName,
		DatabaseURL:   databaseURL,
		JWTSecret:     os.Getenv(JWT_SECRET_ENV),
		AdminUsername: os.Getenv(ADMIN_USERNAME_ENV),
		AdminPassword: os.Getenv(ADMIN_PASSWORD_ENV),
	}
}

// Validate checks if all required environment variables are set and valid
// Returns error with details about missing or invalid configuration
func (e *Environment) Validate() error {
	var missingVars []string
	var invalidVars []string

	// Check required variables
	if e.AppPort == "" {
		missingVars = append(missingVars, APP_PORT_ENV)
	}

	// Check individual database configuration variables
	if e.DBHost == "" {
		missingVars = append(missingVars, DB_HOST_ENV)
	}

	if e.DBPort == "" {
		missingVars = append(missingVars, DB_PORT_ENV)
	}

	if e.DBUser == "" {
		missingVars = append(missingVars, DB_USER_ENV)
	}

	if e.DBPassword == "" {
		missingVars = append(missingVars, DB_PASSWORD_ENV)
	}

	if e.DBName == "" {
		missingVars = append(missingVars, DB_NAME_ENV)
	}

	if e.JWTSecret == "" {
		missingVars = append(missingVars, JWT_SECRET_ENV)
	} else if len(e.JWTSecret) < MinJWTSecretLength {
		invalidVars = append(invalidVars, fmt.Sprintf("%s (minimum %d characters, got %d)",
			JWT_SECRET_ENV, MinJWTSecretLength, len(e.JWTSecret)))
	}

	if e.AdminUsername == "" {
		missingVars = append(missingVars, ADMIN_USERNAME_ENV)
	}

	if e.AdminPassword == "" {
		missingVars = append(missingVars, ADMIN_PASSWORD_ENV)
	} else if len(e.AdminPassword) < MinPasswordLength {
		invalidVars = append(invalidVars, fmt.Sprintf("%s (minimum %d characters)",
			ADMIN_PASSWORD_ENV, MinPasswordLength))
	}

	// Build error message if validation fails
	if len(missingVars) > 0 || len(invalidVars) > 0 {
		var errMsg strings.Builder
		errMsg.WriteString("configuration validation failed:\n")

		if len(missingVars) > 0 {
			errMsg.WriteString(fmt.Sprintf("  Missing required environment variables: %s\n",
				strings.Join(missingVars, ", ")))
		}

		if len(invalidVars) > 0 {
			errMsg.WriteString(fmt.Sprintf("  Invalid environment variables: %s\n",
				strings.Join(invalidVars, ", ")))
		}

		return errors.New(errMsg.String())
	}

	return nil
}
