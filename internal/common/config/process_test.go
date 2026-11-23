package config_test

import (
	"strings"
	"testing"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
)

func TestStartRefusesAChangedTimezone(t *testing.T) {
	clearEnv(t)

	t.Setenv(config.EnvAppSecret, "0123456789abcdef")
	t.Setenv(config.EnvDataDir, t.TempDir())

	t.Setenv(config.EnvTimezone, "Asia/Jakarta")

	first, err := config.Start(t.Context(), "spenicle-test")
	if err != nil {
		t.Fatalf("first boot: %v", err)
	}

	if got := first.Cfg.Timezone; got != "Asia/Jakarta" {
		t.Fatalf("first boot timezone = %q, want Asia/Jakarta", got)
	}

	first.Close(t.Context())

	t.Setenv(config.EnvTimezone, "America/New_York")

	second, err := config.Start(t.Context(), "spenicle-test")
	if err == nil {
		second.Close(t.Context())

		t.Fatal("a second boot with another APP_TIMEZONE must fail")
	}

	t.Logf("second boot refused with: %v", err)

	for _, want := range []string{"Asia/Jakarta", "America/New_York"} {
		if !strings.Contains(err.Error(), want) {
			t.Fatalf("boot error %q must name %q", err, want)
		}
	}
}
