// Package config reads the seven environment variables the process honours.
// No config file: fewer moving parts for a self-hosted single binary.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

// Config is the resolved runtime configuration.
type Config struct {
	Addr             string
	DataDir          string
	Password         string
	AppSecret        string
	ExtractionAPIKey string
	OTLPEndpoint     string
	BaseCurrency     string
}

// Load reads the environment and fails fast on values that cannot work.
func Load() (Config, error) {
	cfg := Config{
		Addr:             env("ADDR", ":8080"),
		DataDir:          env("DATA_DIR", "./data"),
		Password:         os.Getenv("PASSWORD"),
		AppSecret:        os.Getenv("APP_SECRET"),
		ExtractionAPIKey: os.Getenv("EXTRACTION_API_KEY"),
		OTLPEndpoint:     os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
		BaseCurrency:     strings.ToUpper(env("BASE_CURRENCY", "IDR")),
	}

	if cfg.AppSecret != "" && len(cfg.AppSecret) < 16 {
		return Config{}, errors.New("APP_SECRET must be at least 16 bytes")
	}
	if len(cfg.BaseCurrency) != 3 {
		return Config{}, fmt.Errorf("BASE_CURRENCY must be an ISO 4217 code, got %q", cfg.BaseCurrency)
	}
	return cfg, nil
}

// Sealed reports whether the operator configured APP_SECRET.
func (c Config) Sealed() bool { return c.AppSecret != "" }

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
