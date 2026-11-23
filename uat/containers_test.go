//go:build uat_containers

// The tag is deliberate: this suite pulls container images and needs Docker, so it is
// opt-in (`make uat-containers`) and never part of `make test` or the git hook.
package uat_test

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	tcwait "github.com/testcontainers/testcontainers-go/wait"

	"github.com/dimasbaguspm/spenicle/internal/common/clock"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/ledger"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
	"github.com/dimasbaguspm/spenicle/internal/repository/sqlite"
)

const vendorKey = "project-key"

func startVendor(t *testing.T) string {
	t.Helper()

	ctx := t.Context()

	request := testcontainers.ContainerRequest{
		Image:        "python:3-alpine",
		ExposedPorts: []string{"8080/tcp"},
		Files: []testcontainers.ContainerFile{{
			HostFilePath:      filepath.Join("testdata", "fake_vendor.py"),
			ContainerFilePath: "/vendor.py",
			FileMode:          0o644,
		}},
		Cmd: []string{"python3", "/vendor.py"},
		WaitingFor: tcwait.ForHTTP("/healthz").
			WithPort("8080/tcp").
			WithStartupTimeout(90 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: request,
		Started:          true,
	})
	if err != nil {
		t.Skipf("Docker is not available, skipping the container suite: %v", err)
	}

	t.Cleanup(func() {
		_ = container.Terminate(context.WithoutCancel(ctx))
	})

	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("container host: %v", err)
	}

	mapped, err := container.MappedPort(ctx, "8080/tcp")
	if err != nil {
		t.Fatalf("container port: %v", err)
	}

	return fmt.Sprintf("http://%s:%s/partner/v1/snaps", host, mapped.Port())
}

func newCaptures(t *testing.T, endpoint string) *captures.Service {
	t.Helper()

	ctx := t.Context()

	store, err := sqlite.New(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "uat.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = store.Close(context.WithoutCancel(ctx)) })

	if err := sqlite.Migrate(ctx, store.DB()); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	extractor, err := snaptojson.New(endpoint, vendorKey, 10*time.Second)
	if err != nil {
		t.Fatalf("extractor: %v", err)
	}

	clockSystem := clock.System{}
	ledgerService := ledger.New(store, fixedCurrency{code: "IDR"}, clockSystem, clockSystem)

	return captures.New(store, ledgerService, sealer, extractor, clockSystem, clockSystem)
}

type fixedCurrency struct{ code string }

func (f fixedCurrency) BaseCurrency(context.Context) (string, error) { return f.code, nil }

func TestContainerVendorSubmitAndReadBack(t *testing.T) {
	endpoint := startVendor(t)
	service := newCaptures(t, endpoint)

	ctx := t.Context()

	capture, created, err := service.Create(ctx, captures.CreateInput{
		Kind: constant.CaptureKindImage,
		Artifact: &extraction.Artifact{
			Filename:    "receipt.jpg",
			ContentType: "image/jpeg",
			Bytes:       []byte("not really a jpeg"),
		},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if !created {
		t.Fatal("first submit must be a create")
	}

	if capture.Status != constant.CaptureStatusExtracting {
		t.Fatalf("status = %q, want extracting while the vendor runs", capture.Status)
	}

	if capture.JobRef == "" {
		t.Fatal("a 202 must store the vendor's job_ref")
	}

	resolved, err := service.Retry(ctx, capture.ID)
	if err != nil {
		t.Fatalf("retry: %v", err)
	}

	if resolved.Status != constant.CaptureStatusPending {
		t.Fatalf("status = %q, want pending once the snap is COMPLETED", resolved.Status)
	}

	if !strings.Contains(resolved.DraftJSON, "KOPI KENANGAN") {
		t.Fatalf("draft = %q, want the vendor's fields unsealed", resolved.DraftJSON)
	}

	if resolved.JobRef != capture.JobRef {
		t.Fatalf("job_ref changed: %q -> %q", capture.JobRef, resolved.JobRef)
	}
}

func TestContainerVendorRefusesAReadBackWithoutAJobRef(t *testing.T) {
	endpoint := startVendor(t)
	service := newCaptures(t, endpoint)

	ctx := t.Context()

	capture, _, err := service.Create(ctx, captures.CreateInput{
		Kind:    constant.CaptureKindManual,
		RawText: "typed by hand, never submitted",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	if capture.JobRef != "" {
		t.Fatalf("a manual capture must not get a job_ref, got %q", capture.JobRef)
	}

	if _, err := service.Retry(ctx, capture.ID); !errors.Is(err, entity.ErrInvalidState) {
		t.Fatalf("err = %v, want invalid state", err)
	}
}
