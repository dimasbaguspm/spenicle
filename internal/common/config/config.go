// Package config owns the two halves of configuration: every default the process
// has, and the single function that reads the environment. Nothing else in the
// tree answers "what is the timeout" or "where does this value come from".
//
// No config file, no remote config, no precedence chain: this is a self-hosted
// single binary, and eight environment variables do not need a framework. Adding
// one means adding a column to this file, which is the point.
package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	EnvAddr      = "ADDR"
	EnvDataDir   = "DATA_DIR"
	EnvAppSecret = "APP_SECRET"
	//nolint:gosec // G101: this is the environment variable name, not a credential
	EnvSnapToJSONAPIKey = "SNAPTOJSON_API_KEY"
	//nolint:gosec // G101: an environment variable name, not a credential
	EnvOpenAIAPIKey       = "OPENAI_API_KEY"
	EnvOpenAIModel        = "OPENAI_MODEL"
	EnvSnapToJSONEndpoint = "SNAPTOJSON_ENDPOINT"
	EnvOTLPEndpoint       = "OTEL_EXPORTER_OTLP_ENDPOINT"
	EnvWebOrigin          = "WEB_ORIGIN"
)

const (
	DefaultAddr    = ":8080"
	DefaultDataDir = "./data"
	DefaultDBFile  = "spenicle.db"

	DefaultArtifactDirName   = "artifacts"
	DefaultArtifactRetention = 720 * time.Hour
	DefaultArtifactMaxBytes  = 10 << 20

	DefaultExportRetention  = 24 * time.Hour
	DefaultExportStaleAfter = 15 * time.Minute

	DefaultSnapToJSONEndpoint = "https://api.snaptojson.com/partner/v1/snaps"
	DefaultSnapToJSONTimeout  = 30 * time.Second
	DefaultOpenAIModel        = "gpt-4o-mini"

	DefaultECBEndpoint = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
	DefaultECBTimeout  = 10 * time.Second

	DefaultReadHeaderTimeout        = 5 * time.Second
	DefaultReadTimeout              = 15 * time.Second
	DefaultWriteTimeout             = 30 * time.Second
	DefaultIdleTimeout              = 60 * time.Second
	DefaultShutdownTimeout          = 10 * time.Second
	DefaultTelemetryShutdownTimeout = 5 * time.Second
	DefaultHealthTimeout            = 2 * time.Second
	DefaultWorkerInterval           = time.Hour

	DefaultMaxBodyBytes   int64 = 1 << 20
	DefaultDBMaxOpenConns       = 4
	DefaultDBMaxIdleConns       = 2
)

var (
	validate = validator.New() //nolint:gochecknoglobals // one registry, built once
	Version  = "dev"           //nolint:gochecknoglobals // the build stamp, set once with -ldflags -X
)

func Defaults() entity.AppConfig {
	return entity.AppConfig{
		Addr:                     DefaultAddr,
		DataDir:                  DefaultDataDir,
		ArtifactDir:              filepath.Join(DefaultDataDir, DefaultArtifactDirName),
		ArtifactRetention:        DefaultArtifactRetention,
		ArtifactMaxBytes:         DefaultArtifactMaxBytes,
		ExportRetention:          DefaultExportRetention,
		ExportStaleAfter:         DefaultExportStaleAfter,
		DBPath:                   filepath.Join(DefaultDataDir, DefaultDBFile),
		SnapToJSONEndpoint:       DefaultSnapToJSONEndpoint,
		SnapToJSONTimeout:        DefaultSnapToJSONTimeout,
		ECBEndpoint:              DefaultECBEndpoint,
		ECBTimeout:               DefaultECBTimeout,
		OpenAIModel:              DefaultOpenAIModel,
		ReadHeaderTimeout:        DefaultReadHeaderTimeout,
		ReadTimeout:              DefaultReadTimeout,
		WriteTimeout:             DefaultWriteTimeout,
		IdleTimeout:              DefaultIdleTimeout,
		ShutdownTimeout:          DefaultShutdownTimeout,
		TelemetryShutdownTimeout: DefaultTelemetryShutdownTimeout,
		HealthTimeout:            DefaultHealthTimeout,
		WorkerInterval:           DefaultWorkerInterval,
		MaxBodyBytes:             DefaultMaxBodyBytes,
		DBMaxOpenConns:           DefaultDBMaxOpenConns,
		DBMaxIdleConns:           DefaultDBMaxIdleConns,
	}
}

func Load(ctx context.Context) (entity.AppConfig, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.Config.Load")
	defer endSpan()

	cfg := Defaults()
	cfg.ArtifactDir = filepath.Join(cfg.DataDir, DefaultArtifactDirName)

	cfg.Addr = env(EnvAddr, cfg.Addr)
	cfg.DataDir = env(EnvDataDir, cfg.DataDir)
	cfg.DBPath = filepath.Join(cfg.DataDir, DefaultDBFile)
	cfg.AppSecret = os.Getenv(EnvAppSecret)
	cfg.SnapToJSONAPIKey = os.Getenv(EnvSnapToJSONAPIKey)
	cfg.SnapToJSONEndpoint = env(EnvSnapToJSONEndpoint, cfg.SnapToJSONEndpoint)
	cfg.OpenAIAPIKey = os.Getenv(EnvOpenAIAPIKey)
	cfg.OpenAIModel = env(EnvOpenAIModel, DefaultOpenAIModel)
	cfg.OTLPEndpoint = os.Getenv(EnvOTLPEndpoint)
	cfg.WebOrigin = env(EnvWebOrigin, cfg.WebOrigin)

	if err := validate.Struct(cfg); err != nil {
		return entity.AppConfig{}, fmt.Errorf(
			"APP_SECRET is required, at least 16 bytes (generate one with "+
				"`openssl rand -base64 32`): %w", err)
	}

	return cfg, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}
