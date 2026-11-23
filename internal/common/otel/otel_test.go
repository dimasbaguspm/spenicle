package telemetry_test

import (
	"testing"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

func TestParseEndpoint(t *testing.T) {
	cases := map[string]struct {
		in       string
		host     string
		insecure bool
	}{
		"https with port":     {in: "https://otel.example.com:4318", host: "otel.example.com:4318"},
		"https default port":  {in: "https://otel.example.com", host: "otel.example.com:4318"},
		"bare host is secure": {in: "otel.example.com", host: "otel.example.com:4318"},
		"bare host and port":  {in: "collector.internal:4317", host: "collector.internal:4317"},
		"http is explicit":    {in: "http://localhost:4318", host: "localhost:4318", insecure: true},
		"path is dropped":     {in: "https://otel.example.com/v1/traces", host: "otel.example.com:4318"},
		"trailing slash":      {in: "https://otel.example.com:443/", host: "otel.example.com:443"},
		"surrounding spaces":  {in: "  https://collector:4317  ", host: "collector:4317"},
	}

	for name, want := range cases {
		t.Run(name, func(t *testing.T) {
			host, insecure := telemetry.ParseEndpoint(want.in)

			if host != want.host {
				t.Fatalf("host = %q, want %q", host, want.host)
			}

			if insecure != want.insecure {
				t.Fatalf("insecure = %v, want %v (https must be the default)", insecure, want.insecure)
			}
		})
	}
}
