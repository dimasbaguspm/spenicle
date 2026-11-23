package config_test

import (
	"path/filepath"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
)

// clearEnv makes the test independent of the developer's shell.
func clearEnv(t *testing.T) {
	t.Helper()

	for _, key := range []string{
		config.EnvAddr,
		config.EnvDataDir,
		config.EnvPassword,
		config.EnvAppSecret,
		config.EnvExtractionAPIKey,
		config.EnvOTLPEndpoint,
		config.EnvBaseCurrency,
	} {
		t.Setenv(key, "")
	}
}

func TestLoadAppliesDefaults(t *testing.T) {
	clearEnv(t)

	cfg, err := config.Load(t.Context())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if cfg.Addr != config.DefaultAddr {
		t.Fatalf("addr = %q, want %q", cfg.Addr, config.DefaultAddr)
	}

	if cfg.DataDir != config.DefaultDataDir {
		t.Fatalf("data dir = %q, want %q", cfg.DataDir, config.DefaultDataDir)
	}

	wantPath := filepath.Join(config.DefaultDataDir, config.DefaultDBFile)
	if cfg.DBPath != wantPath {
		t.Fatalf("db path = %q, want %q", cfg.DBPath, wantPath)
	}

	if cfg.BaseCurrency != config.DefaultBaseCurrency {
		t.Fatalf("base currency = %q, want %q", cfg.BaseCurrency, config.DefaultBaseCurrency)
	}

	if cfg.TracerName != config.DefaultTracerName {
		t.Fatalf("tracer = %q, want %q", cfg.TracerName, config.DefaultTracerName)
	}

	if cfg.ReadHeaderTimeout != config.DefaultReadHeaderTimeout {
		t.Fatalf("read header timeout = %s, want %s", cfg.ReadHeaderTimeout, config.DefaultReadHeaderTimeout)
	}

	if cfg.MaxBodyBytes != config.DefaultMaxBodyBytes {
		t.Fatalf("max body = %d, want %d", cfg.MaxBodyBytes, config.DefaultMaxBodyBytes)
	}

	if cfg.Sealed() {
		t.Fatal("an empty APP_SECRET must not report sealed")
	}
}

func TestLoadReadsEnvironment(t *testing.T) {
	clearEnv(t)

	dataDir := "/var/lib/spenicle"

	t.Setenv(config.EnvAddr, "127.0.0.1:9999")
	t.Setenv(config.EnvDataDir, dataDir)
	t.Setenv(config.EnvBaseCurrency, "usd")
	t.Setenv(config.EnvAppSecret, "0123456789abcdef")

	cfg, err := config.Load(t.Context())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if cfg.Addr != "127.0.0.1:9999" {
		t.Fatalf("addr = %q", cfg.Addr)
	}

	if want := filepath.Join(dataDir, config.DefaultDBFile); cfg.DBPath != want {
		t.Fatalf("db path = %q, want %q", cfg.DBPath, want)
	}

	if cfg.BaseCurrency != "USD" {
		t.Fatalf("base currency = %q, want it upper-cased", cfg.BaseCurrency)
	}

	if !cfg.Sealed() {
		t.Fatal("APP_SECRET is set, Sealed must be true")
	}
}

func TestLoadRejectsUnusableValues(t *testing.T) {
	cases := map[string]map[string]string{
		"short secret":      {config.EnvAppSecret: "too-short"},
		"base not ISO 4217": {config.EnvBaseCurrency: "RUPIAH"},
	}

	for name, env := range cases {
		t.Run(name, func(t *testing.T) {
			clearEnv(t)

			for key, value := range env {
				t.Setenv(key, value)
			}

			if _, err := config.Load(t.Context()); err == nil {
				t.Fatal("expected an error, got nil")
			}
		})
	}
}

func TestDefaultsAreUsable(t *testing.T) {
	cfg := config.Defaults()

	if cfg.HealthTimeout <= 0 || cfg.ShutdownTimeout <= 0 || cfg.TelemetryShutdownTimeout <= 0 {
		t.Fatalf("timeouts must be positive: %+v", cfg)
	}

	if cfg.DBMaxOpenConns < cfg.DBMaxIdleConns {
		t.Fatalf("open %d < idle %d", cfg.DBMaxOpenConns, cfg.DBMaxIdleConns)
	}

	if want := filepath.Join(config.DefaultDataDir, config.DefaultDBFile); cfg.DBPath != want {
		t.Fatalf("default db path = %q, want %q", cfg.DBPath, want)
	}
}
