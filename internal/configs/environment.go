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
	DATABASE_URL_ENV   = "DATABASE_URL"
	JWT_SECRET_ENV     = "JWT_SECRET"
	ADMIN_USERNAME_ENV = "ADMIN_USERNAME"
	ADMIN_PASSWORD_ENV = "ADMIN_PASSWORD"
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
	DatabaseURL   string
	JWTSecret     string
	AdminUsername string
	AdminPassword string
}

// LoadEnvironment loads and returns environment configuration
func LoadEnvironment() *Environment {
	return &Environment{
		AppPort:       os.Getenv(APP_PORT_ENV),
		DatabaseURL:   os.Getenv(DATABASE_URL_ENV),
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

	if e.DatabaseURL == "" {
		missingVars = append(missingVars, DATABASE_URL_ENV)
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
