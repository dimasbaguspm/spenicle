package telemetry_test

import (
	"testing"

	"go.opentelemetry.io/otel/attribute"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

func TestAttributeMappings(t *testing.T) {
	tests := []struct {
		name  string
		attrs []attribute.KeyValue
		want  map[string]string
	}{
		{
			name:  "http request carries the route pattern",
			attrs: telemetry.HTTPAttributes("GET", "GET /api/entries", 200),
			want: map[string]string{
				"http.request.method":       "GET",
				"http.route":                "GET /api/entries",
				"http.response.status_code": "200",
			},
		},
		{
			name:  "in flight has no status",
			attrs: telemetry.InFlightAttributes("POST", "POST /api/entries"),
			want: map[string]string{
				"http.request.method": "POST",
				"http.route":          "POST /api/entries",
			},
		},
		{
			name:  "worker run names the job and the outcome",
			attrs: telemetry.WorkerAttributes(telemetry.JobRecurring, telemetry.OutcomeOK),
			want: map[string]string{
				"spenicle.job":     "recurring",
				"spenicle.outcome": "ok",
			},
		},
		{
			name:  "ledger posting names the source",
			attrs: telemetry.LedgerAttributes("manual"),
			want:  map[string]string{"spenicle.entry.source": "manual"},
		},
		{
			name:  "capture transition names the kind and the outcome",
			attrs: telemetry.CaptureAttributes("image", "approved"),
			want: map[string]string{
				"spenicle.capture.kind": "image",
				"spenicle.outcome":      "approved",
			},
		},
		{
			name:  "import clash names the clash kind",
			attrs: telemetry.ImportClashAttributes("duplicate"),
			want:  map[string]string{"spenicle.clash.kind": "duplicate"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := make(map[string]string, len(test.attrs))
			for _, attr := range test.attrs {
				got[string(attr.Key)] = attr.Value.String()
			}

			if len(got) != len(test.want) {
				t.Fatalf("attribute count = %d, want %d (%v)", len(got), len(test.want), got)
			}

			for key, want := range test.want {
				if got[key] != want {
					t.Fatalf("%s = %q, want %q", key, got[key], want)
				}
			}
		})
	}
}
