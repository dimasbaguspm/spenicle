package uat_test

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	tcwait "github.com/testcontainers/testcontainers-go/wait"
)

const (
	mockImage        = "gcr.io/distroless/static-debian12:nonroot"
	mockPort         = "8080/tcp"
	mockKey          = "project-key"
	mockBinary       = "mock"
	mockSnaps        = "/partner/v1/snaps"
	mockSnapsDown    = "/partner/v1/down"
	mockSnapsBroken  = "/partner/v1/malformed"
	mockRates        = "/stats/eurofxref/eurofxref-daily.xml"
	mockRatesDown    = "/stats/eurofxref/down.xml"
	mockRatesBroken  = "/stats/eurofxref/malformed.xml"
	mockOpenAI       = "/v1/ok/"
	mockOpenAIDown   = "/v1/down/"
	mockOpenAIBroken = "/v1/malformed/"
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

func endpoint(path string) string {
	if mockBase == "" {
		return ""
	}

	return mockBase + path
}
