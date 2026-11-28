package config_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/config"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
)

func TestStartRefusesAChangedTimezone(t *testing.T) {
	clearEnv(t)

	t.Setenv(config.EnvAppSecret, "0123456789abcdef")
	t.Chdir(t.TempDir())

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

func TestStartRecordsDurableReleaseEvidence(t *testing.T) {
	clearEnv(t)

	originalVersion := config.Version
	config.Version = "v9.9.9+abc1234"
	t.Cleanup(func() { config.Version = originalVersion })

	t.Setenv(config.EnvAppSecret, "0123456789abcdef")
	t.Chdir(t.TempDir())

	process, err := config.Start(t.Context(), "spenicle-http")
	if err != nil {
		t.Fatalf("boot: %v", err)
	}
	defer process.Close(t.Context())

	if process.StartedAt.IsZero() {
		t.Fatal("the process must carry its start time")
	}

	records, err := process.Store.ListAudit(t.Context(), entity.AuditFilter{
		EntityKind: constant.AuditEntitySystem,
		Action:     constant.AuditActionStart,
		Limit:      10,
	})
	if err != nil {
		t.Fatalf("list start records: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("start records = %d, want 1", len(records))
	}

	record := records[0]
	if record.ActorKind != constant.AuditActorSystem {
		t.Fatalf("actor = %q, want %q", record.ActorKind, constant.AuditActorSystem)
	}

	var payload struct {
		Service       string `json:"service"`
		Version       string `json:"version"`
		SchemaVersion int    `json:"schema_version"`
		StartedAt     string `json:"started_at"`
	}
	if err := json.Unmarshal([]byte(record.ToJSON), &payload); err != nil {
		t.Fatalf("decode start payload: %v", err)
	}

	if payload.Service != "spenicle-http" {
		t.Fatalf("service = %q, want spenicle-http", payload.Service)
	}
	if payload.Version != "v9.9.9+abc1234" {
		t.Fatalf("version = %q, want v9.9.9+abc1234", payload.Version)
	}
	if payload.SchemaVersion < 1 {
		t.Fatalf("schema_version = %d, want a migrated schema", payload.SchemaVersion)
	}
	if _, err := time.Parse(time.RFC3339, payload.StartedAt); err != nil {
		t.Fatalf("started_at %q is not RFC3339: %v", payload.StartedAt, err)
	}
}
