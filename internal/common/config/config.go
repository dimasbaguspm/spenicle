// Package config reads the environment variables the process honours. No config
// file: fewer moving parts for a self-hosted single binary.
package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
)

// Environment variable names, exported so a deployment manifest and the code
// cannot drift apart silently.
const (
	EnvAddr             = "ADDR"
	EnvDataDir          = "DATA_DIR"
	EnvPassword         = "PASSWORD"
	EnvAppSecret        = "APP_SECRET"
	EnvExtractionAPIKey = "EXTRACTION_API_KEY"
	EnvOTLPEndpoint     = "OTEL_EXPORTER_OTLP_ENDPOINT"
	EnvBaseCurrency     = "BASE_CURRENCY"
)

const (
	defaultAddr         = ":8080"
	defaultDataDir      = "./data"
	defaultBaseCurrency = "IDR"
	minSecretBytes      = 16
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
func Load(ctx context.Context) (Config, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.Config.Load")
	defer endSpan()

	cfg := Config{
		Addr:             env(EnvAddr, defaultAddr),
		DataDir:          env(EnvDataDir, defaultDataDir),
		Password:         os.Getenv(EnvPassword),
		AppSecret:        os.Getenv(EnvAppSecret),
		ExtractionAPIKey: os.Getenv(EnvExtractionAPIKey),
		OTLPEndpoint:     os.Getenv(EnvOTLPEndpoint),
		BaseCurrency:     strings.ToUpper(env(EnvBaseCurrency, defaultBaseCurrency)),
	}

	if cfg.AppSecret != "" && len(cfg.AppSecret) < minSecretBytes {
		return Config{}, errors.New("APP_SECRET must be at least 16 bytes")
	}

	if len(cfg.BaseCurrency) != constant.ISOCodeLength {
		return Config{}, fmt.Errorf("BASE_CURRENCY must be an ISO 4217 code, got %q", cfg.BaseCurrency)
	}

	return cfg, nil
}

// Sealed reports whether the operator configured APP_SECRET.
func (c Config) Sealed() bool { return c.AppSecret != "" }

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}
