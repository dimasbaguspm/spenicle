package uat_test

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
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

const (
	mockImage  = "gcr.io/distroless/static-debian12:nonroot"
	mockPort   = "8080/tcp"
	mockKey    = "project-key"
	mockBinary = "mock"
	mockSnaps  = "/partner/v1/snaps"
	mockRates  = "/stats/eurofxref/eurofxref-daily.xml"
)

var mockBase string //nolint:gochecknoglobals // one container per package run, read-only afterwards

func TestMain(m *testing.M) {
	os.Exit(runSuite(m))
}

func runSuite(m *testing.M) int {
	base, terminate, err := startMock(context.Background())
	if err != nil {
		return m.Run()
	}

	defer terminate()

	mockBase = base

	return m.Run()
}

func startMock(ctx context.Context) (string, func(), error) {
	dir, err := os.MkdirTemp("", "spenicle-mock")
	if err != nil {
		return "", nil, fmt.Errorf("temp dir: %w", err)
	}

	binary := filepath.Join(dir, mockBinary)

	build := exec.CommandContext(ctx, "go", "build", "-o", binary, "./"+mockBinary)
	build.Env = append(os.Environ(), "CGO_ENABLED=0")

	if output, buildErr := build.CombinedOutput(); buildErr != nil {
		_ = os.RemoveAll(dir)

		return "", nil, fmt.Errorf("build the mock service: %w: %s", buildErr, output)
	}

	request := testcontainers.ContainerRequest{
		Image:        mockImage,
		ExposedPorts: []string{mockPort},
		Files: []testcontainers.ContainerFile{{
			HostFilePath:      binary,
			ContainerFilePath: "/" + mockBinary,
			FileMode:          0o755,
		}},
		Cmd: []string{"/" + mockBinary},
		WaitingFor: tcwait.ForHTTP("/healthz").
			WithPort(mockPort).
			WithStartupTimeout(90 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: request,
		Started:          true,
	})
	if err != nil {
		_ = os.RemoveAll(dir)

		return "", nil, fmt.Errorf("start the mock service: %w", err)
	}

	terminate := func() {
		_ = container.Terminate(context.WithoutCancel(ctx))
		_ = os.RemoveAll(dir)
	}

	host, err := container.Host(ctx)
	if err != nil {
		terminate()

		return "", nil, fmt.Errorf("container host: %w", err)
	}

	mapped, err := container.MappedPort(ctx, mockPort)
	if err != nil {
		terminate()

		return "", nil, fmt.Errorf("container port: %w", err)
	}

	return "http://" + net.JoinHostPort(host, mapped.Port()), terminate, nil
}

func requireMock(t *testing.T) string {
	t.Helper()

	if mockBase == "" {
		t.Skip("Docker is not available, skipping the mock services")
	}

	return mockBase
}

func ratesEndpoint() string {
	if mockBase == "" {
		return ""
	}

	return mockBase + mockRates
}

func newCaptures(t *testing.T, endpoint string) *captures.Service {
	t.Helper()

	ctx := t.Context()

	store, err := sqlite.New(ctx, sqlite.Config{Path: filepath.Join(t.TempDir(), "uat.db")})
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	t.Cleanup(func() { _ = store.Close(context.WithoutCancel(ctx)) })

	if migrateErr := sqlite.Migrate(ctx, store.DB()); migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}

	sealer, err := seal.New("0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	extractor, err := snaptojson.New(endpoint, mockKey, 10*time.Second)
	if err != nil {
		t.Fatalf("extractor: %v", err)
	}

	clockSystem := clock.System{}
	ledgerService := ledger.New(store, fixedCurrency{code: "IDR"}, clockSystem, clockSystem)

	return captures.New(store, ledgerService, sealer, extractor, clockSystem, clockSystem)
}

type fixedCurrency struct{ code string }

func (f fixedCurrency) BaseCurrency(context.Context) (string, error) { return f.code, nil }

func TestMockVendorSubmitAndReadBack(t *testing.T) {
	service := newCaptures(t, requireMock(t)+mockSnaps)

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

func TestMockVendorRefusesAReadBackWithoutAJobRef(t *testing.T) {
	service := newCaptures(t, requireMock(t)+mockSnaps)

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
