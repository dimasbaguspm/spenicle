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
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

const (
	EnvAppSecret = "APP_SECRET"
	//nolint:gosec // G101: this is the environment variable name, not a credential
	EnvSnapToJSONAPIKey = "SNAPTOJSON_API_KEY"
	//nolint:gosec // G101: an environment variable name, not a credential
	EnvOpenAIAPIKey       = "OPENAI_API_KEY"
	EnvOpenAIModel        = "OPENAI_MODEL"
	EnvOpenAIHost         = "OPENAI_HOST"
	EnvSnapToJSONEndpoint = "SNAPTOJSON_ENDPOINT"
	EnvOTLPEndpoint       = "OTEL_EXPORTER_OTLP_ENDPOINT"
	EnvTimezone           = "APP_TIMEZONE"

	EnvMaxBodyBytes     = "APP_MAX_BODY_BYTES"
	EnvArtifactMaxBytes = "APP_ARTIFACT_MAX_BYTES"
	EnvImportMaxBytes   = "APP_IMPORT_MAX_BYTES"
	EnvArtifactKeep     = "APP_ARTIFACT_RETENTION"
	EnvExportKeep       = "APP_EXPORT_RETENTION"
	EnvWorkerInterval   = "APP_WORKER_INTERVAL"
	EnvHealthTimeout    = "APP_HEALTH_TIMEOUT"
	EnvCommitChunk      = "APP_IMPORT_COMMIT_CHUNK"
)

const (
	ListenAddr    = ":8080"
	DataDir       = "./data"
	DefaultDBFile = "spenicle.db"

	DefaultArtifactDirName   = "artifacts"
	DefaultArtifactRetention = 720 * time.Hour
	DefaultArtifactMaxBytes  = 10 << 20

	DefaultImportDirName     = "imports"
	DefaultImportMaxBytes    = 32 << 20
	DefaultImportMaxRows     = 50_000
	DefaultImportCommitChunk = 500

	DefaultExportDirName    = "exports"
	DefaultExportRetention  = 30 * 24 * time.Hour
	DefaultExportStaleAfter = 15 * time.Minute

	DefaultSnapToJSONEndpoint = "https://api.snaptojson.com/partner/v1/snaps"
	DefaultSnapToJSONTimeout  = 30 * time.Second
	DefaultOpenAIModel        = "gpt-4o-mini"
	DefaultOpenAIHost         = "https://api.openai.com/v1"

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
		Addr:                     ListenAddr,
		DataDir:                  DataDir,
		ArtifactDir:              filepath.Join(DataDir, DefaultArtifactDirName),
		ArtifactRetention:        DefaultArtifactRetention,
		ArtifactMaxBytes:         DefaultArtifactMaxBytes,
		ExportDir:                filepath.Join(DataDir, DefaultExportDirName),
		ImportMaxBytes:           DefaultImportMaxBytes,
		ImportMaxRows:            DefaultImportMaxRows,
		ImportCommitChunk:        DefaultImportCommitChunk,
		ExportRetention:          DefaultExportRetention,
		ExportStaleAfter:         DefaultExportStaleAfter,
		DBPath:                   filepath.Join(DataDir, DefaultDBFile),
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

	cfg.AppSecret = os.Getenv(EnvAppSecret)
	cfg.SnapToJSONAPIKey = os.Getenv(EnvSnapToJSONAPIKey)
	cfg.SnapToJSONEndpoint = env(EnvSnapToJSONEndpoint, cfg.SnapToJSONEndpoint)
	cfg.OpenAIAPIKey = os.Getenv(EnvOpenAIAPIKey)
	cfg.OpenAIHost = os.Getenv(EnvOpenAIHost)
	cfg.OpenAIModel = env(EnvOpenAIModel, DefaultOpenAIModel)
	cfg.OTLPEndpoint = os.Getenv(EnvOTLPEndpoint)

	timezone, err := loadTimezone(os.Getenv(EnvTimezone))
	if err != nil {
		return entity.AppConfig{}, err
	}

	cfg.Timezone = timezone

	for _, knob := range []struct {
		env   string
		apply func() error
	}{
		{EnvMaxBodyBytes, func() error { return envInt64(EnvMaxBodyBytes, &cfg.MaxBodyBytes) }},
		{EnvArtifactMaxBytes, func() error { return envInt64(EnvArtifactMaxBytes, &cfg.ArtifactMaxBytes) }},
		{EnvImportMaxBytes, func() error { return envInt64(EnvImportMaxBytes, &cfg.ImportMaxBytes) }},
		{EnvArtifactKeep, func() error { return envDuration(EnvArtifactKeep, &cfg.ArtifactRetention) }},
		{EnvExportKeep, func() error { return envDuration(EnvExportKeep, &cfg.ExportRetention) }},
		{EnvWorkerInterval, func() error { return envDuration(EnvWorkerInterval, &cfg.WorkerInterval) }},
		{EnvHealthTimeout, func() error { return envDuration(EnvHealthTimeout, &cfg.HealthTimeout) }},
		{EnvCommitChunk, func() error { return envInt(EnvCommitChunk, &cfg.ImportCommitChunk) }},
	} {
		if err := knob.apply(); err != nil {
			return entity.AppConfig{}, err
		}
	}

	if err := validate.Struct(cfg); err != nil {
		return entity.AppConfig{}, fmt.Errorf(
			"APP_SECRET is required, at least 16 bytes (generate one with "+
				"`openssl rand -base64 32`): %w", err,
		)
	}

	return cfg, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}

func envInt64(key string, target *int64) error {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parsed, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || parsed <= 0 {
		return fmt.Errorf("%s %q is not a positive integer", key, raw)
	}

	*target = parsed

	return nil
}

func envInt(key string, target *int) error {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return fmt.Errorf("%s %q is not a positive integer", key, raw)
	}

	*target = parsed

	return nil
}

func envDuration(key string, target *time.Duration) error {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parsed, err := time.ParseDuration(raw)
	if err != nil || parsed <= 0 {
		return fmt.Errorf("%s %q is not a positive duration (for example 720h)", key, raw)
	}

	*target = parsed

	return nil
}

func loadTimezone(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", nil
	}

	location, err := time.LoadLocation(trimmed)
	if err != nil {
		return "", fmt.Errorf("APP_TIMEZONE %q is not an IANA timezone name: %w", trimmed, err)
	}

	return location.String(), nil
}
