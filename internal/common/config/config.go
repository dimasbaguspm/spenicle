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
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
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
	// EnvAppSecretReset is the one escape hatch: start despite a fingerprint
	// mismatch and discard the sealed payloads. See docs/v2-design.md.
	EnvAppSecretReset = "APP_SECRET_RESET"
)

// Defaults for everything that is not environment-dependent. Timeouts and limits
// are here rather than next to the code that uses them, so one file answers "what
// does this process do if nobody configures it".
const (
	DefaultAddr         = ":8080"
	DefaultDataDir      = "./data"
	DefaultDBFile       = "spenicle.db"
	DefaultBaseCurrency = "IDR"

	DefaultServiceName = "spenicle"
	DefaultTracerName  = "spenicle"

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
		BaseCurrency:             DefaultBaseCurrency,
		ServiceName:              DefaultServiceName,
		TracerName:               DefaultTracerName,
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
	cfg.Password = os.Getenv(EnvPassword)
	cfg.AppSecret = os.Getenv(EnvAppSecret)
	cfg.ExtractionAPIKey = os.Getenv(EnvExtractionAPIKey)
	cfg.OTLPEndpoint = os.Getenv(EnvOTLPEndpoint)
	cfg.BaseCurrency = strings.ToUpper(env(EnvBaseCurrency, cfg.BaseCurrency))

	reset, err := boolEnv(EnvAppSecretReset)
	if err != nil {
		return entity.AppConfig{}, err
	}

	cfg.AllowSecretReset = reset

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

	if len(cfg.BaseCurrency) != constant.ISOCodeLength {
		return fmt.Errorf("BASE_CURRENCY must be an ISO 4217 code, got %q", cfg.BaseCurrency)
	}

	return nil
}

// boolEnv reads an optional boolean, treating empty as false.
func boolEnv(key string) (bool, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return false, nil
	}

	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false, got %q", key, raw)
	}

	return value, nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}
