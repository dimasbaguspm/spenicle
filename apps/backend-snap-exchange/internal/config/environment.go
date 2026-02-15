package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Environment struct {
	AppPort  string
	ECBURL   string
	LogLevel string
}

func NewEnvironment() Environment {
	_ = godotenv.Load() // Load .env if exists, ignore errors

	return Environment{
		AppPort:  getEnvWithDefault("APP_PORT", "8080"),
		ECBURL:   getEnvWithDefault("ECB_URL", "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"),
		LogLevel: getEnvWithDefault("LOG_LEVEL", "info"),
	}
}

func getEnvWithDefault(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}
