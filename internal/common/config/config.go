// Package config owns the two halves of configuration: every default the process
// has, and the single function that reads the environment. Nothing else in the
// tree answers "what is the timeout" or "where does this value come from".
//
// No config file, no remote config, no precedence chain: this is a self-hosted
// single binary, and seven environment variables do not need a framework. Adding
// one means adding a column to this file, which is the point.
package config

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

// Environment variable names, exported so a deployment manifest and the code
// cannot drift apart silently.
const (
	EnvAddr      = "ADDR"
	EnvDataDir   = "DATA_DIR"
	EnvPassword  = "PASSWORD"
	EnvAppSecret = "APP_SECRET"
	//nolint:gosec // G101: this is the environment variable name, not a credential
	EnvSnapToJSONAPIKey = "SNAPTOJSON_API_KEY"
	// EnvSnapToJSONEndpoint overrides the vendor route, for a proxy or a staging
	// account. Unset means the documented production endpoint.
	EnvSnapToJSONEndpoint = "SNAPTOJSON_ENDPOINT"
	EnvOTLPEndpoint       = "OTEL_EXPORTER_OTLP_ENDPOINT"
	EnvBaseCurrency       = "BASE_CURRENCY"
)

// Defaults for everything that is not environment-dependent. Timeouts and limits
// are here rather than next to the code that uses them, so one file answers "what
// does this process do if nobody configures it".
const (
	DefaultAddr    = ":8080"
	DefaultDataDir = "./data"
	DefaultDBFile  = "spenicle.db"

	// DefaultServiceName is also the tracer name: one identity for spans, metrics
	// and logs.
	DefaultServiceName = "spenicle"

	// DefaultSnapToJSONEndpoint is the vendor's single partner route, from
	// https://snaptojson.com/docs/api.
	DefaultSnapToJSONEndpoint = "https://api.snaptojson.com/partner/v1/snaps"
	// DefaultSnapToJSONTimeout is long on purpose: the vendor holds a submit for up
	// to ten seconds before answering 202, and we must outlast that.
	DefaultSnapToJSONTimeout = 30 * time.Second

	DefaultReadHeaderTimeout = 5 * time.Second
	DefaultReadTimeout       = 15 * time.Second
	DefaultWriteTimeout      = 30 * time.Second
	DefaultIdleTimeout       = 60 * time.Second
	DefaultShutdownTimeout   = 10 * time.Second
	// DefaultTelemetryShutdownTimeout is its own budget: the signal that stopped
	// the process has already cancelled the root context when the last batch of
	// spans is flushed.
	DefaultTelemetryShutdownTimeout = 5 * time.Second
	DefaultHealthTimeout            = 2 * time.Second

	DefaultMaxBodyBytes   int64 = 1 << 20
	DefaultDBMaxOpenConns       = 4
	DefaultDBMaxIdleConns       = 2
)

// minSecretBytes is the shortest APP_SECRET worth deriving a key from.
const minSecretBytes = 16

// Defaults is the configuration of a process started with an empty environment.
// Tests and the UAT harness use it directly instead of reading the real env.
func Defaults() entity.AppConfig {
	return entity.AppConfig{
		Addr:                     DefaultAddr,
		DataDir:                  DefaultDataDir,
		DBPath:                   filepath.Join(DefaultDataDir, DefaultDBFile),
		SnapToJSONEndpoint:       DefaultSnapToJSONEndpoint,
		SnapToJSONTimeout:        DefaultSnapToJSONTimeout,
		ServiceName:              DefaultServiceName,
		ReadHeaderTimeout:        DefaultReadHeaderTimeout,
		ReadTimeout:              DefaultReadTimeout,
		WriteTimeout:             DefaultWriteTimeout,
		IdleTimeout:              DefaultIdleTimeout,
		ShutdownTimeout:          DefaultShutdownTimeout,
		TelemetryShutdownTimeout: DefaultTelemetryShutdownTimeout,
		HealthTimeout:            DefaultHealthTimeout,
		MaxBodyBytes:             DefaultMaxBodyBytes,
		DBMaxOpenConns:           DefaultDBMaxOpenConns,
		DBMaxIdleConns:           DefaultDBMaxIdleConns,
	}
}

// Load applies the environment on top of Defaults and fails fast on values that
// cannot work. Everything that is not an environment variable keeps its default.
func Load(ctx context.Context) (entity.AppConfig, error) {
	_, endSpan := telemetry.StartSpan(ctx, "Common.Config.Load")
	defer endSpan()

	cfg := Defaults()

	cfg.Addr = env(EnvAddr, cfg.Addr)
	cfg.DataDir = env(EnvDataDir, cfg.DataDir)
	cfg.DBPath = filepath.Join(cfg.DataDir, DefaultDBFile)
	cfg.AppSecret = os.Getenv(EnvAppSecret)
	cfg.SnapToJSONAPIKey = os.Getenv(EnvSnapToJSONAPIKey)
	cfg.SnapToJSONEndpoint = env(EnvSnapToJSONEndpoint, cfg.SnapToJSONEndpoint)
	cfg.OTLPEndpoint = os.Getenv(EnvOTLPEndpoint)

	if err := validate(cfg); err != nil {
		return entity.AppConfig{}, err
	}

	return cfg, nil
}

// validate rejects values that would only fail later, at a worse moment.
func validate(cfg entity.AppConfig) error {
	if cfg.AppSecret == "" {
		return errors.New("APP_SECRET is required: it seals capture payloads and " +
			"identifies this database; generate one with `openssl rand -base64 32`")
	}

	if len(cfg.AppSecret) < minSecretBytes {
		return errors.New("APP_SECRET must be at least 16 bytes")
	}

	return nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}
