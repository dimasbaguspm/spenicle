package config_test

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func clearEnv(t *testing.T) {
	t.Helper()

	for _, key := range []string{
		config.EnvAppSecret,
		config.EnvSnapToJSONAPIKey,
		config.EnvSnapToJSONEndpoint,
		config.EnvOpenAIAPIKey,
		config.EnvOpenAIModel,
		config.EnvOpenAIHost,
		config.EnvOTLPEndpoint,
		config.EnvTimezone,
	} {
		t.Setenv(key, "")
	}
}

func TestLoadAppliesDefaults(t *testing.T) {
	clearEnv(t)
	t.Setenv(config.EnvAppSecret, "0123456789abcdef")

	cfg, err := config.Load(t.Context())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if cfg.Addr != config.ListenAddr {
		t.Fatalf("addr = %q, want %q", cfg.Addr, config.ListenAddr)
	}

	if cfg.DataDir != config.DataDir {
		t.Fatalf("data dir = %q, want %q", cfg.DataDir, config.DataDir)
	}

	wantPath := filepath.Join(config.DataDir, config.DefaultDBFile)
	if cfg.DBPath != wantPath {
		t.Fatalf("db path = %q, want %q", cfg.DBPath, wantPath)
	}

	if cfg.ServiceName != "" {
		t.Fatalf("service name = %q, want the caller to supply it", cfg.ServiceName)
	}

	if cfg.ReadHeaderTimeout != config.DefaultReadHeaderTimeout {
		t.Fatalf("read header timeout = %s, want %s", cfg.ReadHeaderTimeout, config.DefaultReadHeaderTimeout)
	}

	if cfg.MaxBodyBytes != config.DefaultMaxBodyBytes {
		t.Fatalf("max body = %d, want %d", cfg.MaxBodyBytes, config.DefaultMaxBodyBytes)
	}

	if !cfg.Sealed() {
		t.Fatal("APP_SECRET is set, Sealed must be true")
	}
}

func TestLoadRequiresAppSecret(t *testing.T) {
	clearEnv(t)

	if _, err := config.Load(t.Context()); err == nil {
		t.Fatal("APP_SECRET is mandatory, an empty value must fail")
	}
}

func TestLoadIgnoresTheRemovedStorageAndNetworkVariables(t *testing.T) {
	clearEnv(t)

	t.Setenv("ADDR", "127.0.0.1:9999")
	t.Setenv("DATA_DIR", "/var/lib/spenicle")
	t.Setenv(config.EnvAppSecret, "0123456789abcdef")

	cfg, err := config.Load(t.Context())
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if cfg.Addr != config.ListenAddr {
		t.Fatalf("addr = %q, want the fixed %q", cfg.Addr, config.ListenAddr)
	}

	if cfg.DataDir != config.DataDir {
		t.Fatalf("data dir = %q, want the fixed %q", cfg.DataDir, config.DataDir)
	}

	if want := filepath.Join(config.DataDir, config.DefaultDBFile); cfg.DBPath != want {
		t.Fatalf("db path = %q, want %q", cfg.DBPath, want)
	}

	if want := filepath.Join(config.DataDir, config.DefaultArtifactDirName); cfg.ArtifactDir != want {
		t.Fatalf("artifact dir = %q, want %q", cfg.ArtifactDir, want)
	}

	if want := filepath.Join(config.DataDir, config.DefaultExportDirName); cfg.ExportDir != want {
		t.Fatalf("export dir = %q, want %q", cfg.ExportDir, want)
	}

	if !cfg.Sealed() {
		t.Fatal("APP_SECRET is set, Sealed must be true")
	}
}

func TestLoadRejectsUnusableValues(t *testing.T) {
	cases := map[string]map[string]string{
		"missing secret": {config.EnvAppSecret: ""},
		"short secret":   {config.EnvAppSecret: "too-short"},
	}

	for name, env := range cases {
		t.Run(name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv(config.EnvAppSecret, "0123456789abcdef")

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

	if want := filepath.Join(config.DataDir, config.DefaultDBFile); cfg.DBPath != want {
		t.Fatalf("default db path = %q, want %q", cfg.DBPath, want)
	}
}

func TestLoadTimezone(t *testing.T) {
	cases := []struct {
		name    string
		value   string
		want    string
		wantErr string
	}{
		{name: "an IANA name is accepted", value: "Asia/Jakarta", want: "Asia/Jakarta"},
		{name: "an alias is canonicalised", value: "UTC", want: "UTC"},
		{name: "an unknown zone fails and names the value", value: "Mars/Olympus", wantErr: "Mars/Olympus"},
		{name: "empty keeps the stored value", value: "", want: ""},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv(config.EnvAppSecret, "0123456789abcdef")
			t.Setenv(config.EnvTimezone, testCase.value)

			cfg, err := config.Load(t.Context())

			if testCase.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), testCase.wantErr) {
					t.Fatalf("load error = %v, want it to mention %q", err, testCase.wantErr)
				}

				return
			}

			if err != nil {
				t.Fatalf("load: %v", err)
			}

			if cfg.Timezone != testCase.want {
				t.Fatalf("timezone = %q, want %q", cfg.Timezone, testCase.want)
			}
		})
	}
}

func TestDefaultsLeaveTimezoneToTheFirstBoot(t *testing.T) {
	if cfg := config.Defaults(); cfg.Timezone != "" {
		t.Fatalf("default timezone = %q, want the empty \"no opinion\" value", cfg.Timezone)
	}
}

func TestAIAssistanceNeedsAllThreeOpenAIVariables(t *testing.T) {
	cases := []struct {
		name  string
		host  string
		key   string
		model string
		want  bool
	}{
		{
			name: "host, key and model are all set",
			host: "https://api.openai.com/v1", key: "sk-test", model: "gpt-4o-mini", want: true,
		},
		{name: "a missing host disables it", key: "sk-test", model: "gpt-4o-mini"},
		{name: "a missing key disables it", host: "https://api.openai.com/v1", model: "gpt-4o-mini"},
		{name: "a missing model disables it", host: "https://api.openai.com/v1", key: "sk-test"},
		{name: "nothing set disables it"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			cfg := entity.AppConfig{
				OpenAIHost:   testCase.host,
				OpenAIAPIKey: testCase.key,
				OpenAIModel:  testCase.model,
			}

			if got := cfg.AIAssistance(); got != testCase.want {
				t.Fatalf("ai assistance = %v, want %v", got, testCase.want)
			}
		})
	}
}

func TestLoadReadsTheOpenAIVariables(t *testing.T) {
	cases := []struct {
		name      string
		env       map[string]string
		wantHost  string
		wantModel string
	}{
		{
			name:      "the model falls back to the documented default",
			env:       map[string]string{config.EnvOpenAIAPIKey: "sk-test"},
			wantModel: config.DefaultOpenAIModel,
		},
		{
			name: "every variable is read",
			env: map[string]string{
				config.EnvOpenAIHost:   "http://127.0.0.1:9999/v1",
				config.EnvOpenAIAPIKey: "sk-test",
				config.EnvOpenAIModel:  "gpt-4o",
			},
			wantHost:  "http://127.0.0.1:9999/v1",
			wantModel: "gpt-4o",
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv(config.EnvAppSecret, "0123456789abcdef")

			for key, value := range testCase.env {
				t.Setenv(key, value)
			}

			cfg, err := config.Load(t.Context())
			if err != nil {
				t.Fatalf("load: %v", err)
			}

			if cfg.OpenAIHost != testCase.wantHost {
				t.Fatalf("host = %q, want %q", cfg.OpenAIHost, testCase.wantHost)
			}

			if cfg.OpenAIModel != testCase.wantModel {
				t.Fatalf("model = %q, want %q", cfg.OpenAIModel, testCase.wantModel)
			}
		})
	}
}

func TestExportDirIsItsOwnDirectoryUnderTheDataDir(t *testing.T) {
	cfg := config.Defaults()

	if want := filepath.Join(config.DataDir, config.DefaultExportDirName); cfg.ExportDir != want {
		t.Fatalf("export dir = %q, want %q", cfg.ExportDir, want)
	}

	if cfg.ExportDir == cfg.ArtifactDir {
		t.Fatalf("the exports must not share the artifact dir %q", cfg.ArtifactDir)
	}
}

func TestExportRetentionIsAMonth(t *testing.T) {
	if want := 30 * 24 * time.Hour; config.DefaultExportRetention != want {
		t.Fatalf("export retention = %s, want %s", config.DefaultExportRetention, want)
	}
}
