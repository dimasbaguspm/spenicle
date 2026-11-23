package snaptojson_test

import (
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"github.com/dimasbaguspm/spenicle/internal/repository/snaptojson"
)

// newServer answers one route the way https://snaptojson.com/docs/api documents it
// and records what it received, so the test proves the wire shape, not just the
// decode.
type captured struct {
	apiKey      string
	contentType string
	fileName    string
	fileBody    string
	snapID      string
}

func newServer(t *testing.T, status int, body string) (*httptest.Server, *captured) {
	t.Helper()

	seen := &captured{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen.apiKey = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		seen.contentType = r.Header.Get("Content-Type")

		mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || mediaType != "multipart/form-data" {
			t.Errorf("content type = %q, want multipart/form-data", r.Header.Get("Content-Type"))
		}

		reader := multipart.NewReader(r.Body, params["boundary"])
		for {
			part, partErr := reader.NextPart()
			if partErr == io.EOF {
				break
			}

			if partErr != nil {
				t.Errorf("read part: %v", partErr)

				break
			}

			payload, _ := io.ReadAll(part)

			switch part.FormName() {
			case "file":
				seen.fileName = part.FileName()
				seen.fileBody = string(payload)
			case "snap_id":
				seen.snapID = string(payload)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))

	t.Cleanup(server.Close)

	return server, seen
}

func TestSubmitSendsTheDocumentedShape(t *testing.T) {
	server, seen := newServer(t, http.StatusOK, `{
		"job_ref":"snap_123",
		"status":"COMPLETED",
		"result":{"data":{"total":"25000"},"valid":true,"violations":[]},
		"error_message":""
	}`)

	extractor, err := snaptojson.New(server.URL, "project-key", 5*time.Second)
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	report, err := extractor.Submit(t.Context(), snaptojson.Artifact{
		Filename:    "receipt.jpg",
		ContentType: "image/jpeg",
		Bytes:       []byte("jpeg bytes"),
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}

	if seen.apiKey != "project-key" {
		t.Fatalf("authorization = %q, want the project key", seen.apiKey)
	}

	if seen.fileName != "receipt.jpg" || seen.fileBody != "jpeg bytes" {
		t.Fatalf("file part = %q / %q", seen.fileName, seen.fileBody)
	}

	if report.JobRef != "snap_123" || report.Status != "COMPLETED" {
		t.Fatalf("report = %+v", report)
	}

	if report.Result == nil || !report.Result.Valid {
		t.Fatalf("result = %+v", report.Result)
	}

	if got := string(report.Result.Data); got != `{"total":"25000"}` {
		t.Fatalf("data = %s", got)
	}
}

func TestSubmitReturnsAStillRunningReport(t *testing.T) {
	server, _ := newServer(t, http.StatusAccepted, `{"job_ref":"snap_456","status":"EXECUTING"}`)

	extractor, _ := snaptojson.New(server.URL, "k", 5*time.Second)

	report, err := extractor.Submit(t.Context(), snaptojson.Artifact{
		Filename: "receipt.jpg", ContentType: "image/jpeg", Bytes: []byte("x"),
	})
	if err != nil {
		t.Fatalf("202 is not an error: %v", err)
	}

	if report.Status != "EXECUTING" || report.JobRef != "snap_456" {
		t.Fatalf("report = %+v", report)
	}
}

func TestFetchPostsSnapID(t *testing.T) {
	server, seen := newServer(t, http.StatusOK, `{"job_ref":"snap_789","status":"COMPLETED",
		"result":{"data":{},"valid":false,"violations":[{"pointer":"/total","error":"required"}]}}`)

	extractor, _ := snaptojson.New(server.URL, "k", 5*time.Second)

	report, err := extractor.Fetch(t.Context(), "snap_789")
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}

	if seen.snapID != "snap_789" {
		t.Fatalf("snap_id = %q", seen.snapID)
	}

	if seen.fileName != "" {
		t.Fatalf("a read-back must not send a file, got %q", seen.fileName)
	}

	if report.Result == nil || len(report.Result.Violations) != 1 ||
		report.Result.Violations[0].Pointer != "/total" {
		t.Fatalf("violations = %+v", report.Result)
	}
}

func TestErrorsCarryTheEnvelope(t *testing.T) {
	cases := map[int]string{
		401: "invalid_credential",
		402: "insufficient_credits",
		404: "snap_not_found",
		413: "image_too_large",
		415: "input_unsupported",
		422: "invalid_body",
		500: "internal_error",
		503: "no_eligible_model",
	}

	for status, code := range cases {
		t.Run(code, func(t *testing.T) {
			server, _ := newServer(t, status, `{"error":{"code":"`+code+`","message":"nope"}}`)

			extractor, _ := snaptojson.New(server.URL, "k", 5*time.Second)

			_, err := extractor.Submit(t.Context(), snaptojson.Artifact{Bytes: []byte("x")})

			var apiErr *snaptojson.APIError
			if !errors.As(err, &apiErr) {
				t.Fatalf("err = %v, want *APIError", err)
			}

			if apiErr.Code != code || apiErr.Status != status {
				t.Fatalf("error = %+v, want %d %s", apiErr, status, code)
			}
		})
	}
}

func TestNewRefusesAnEmptyKey(t *testing.T) {
	if _, err := snaptojson.New("https://example.test", "", time.Second); err == nil {
		t.Fatal("an empty key must fail: the vendor has no anonymous mode")
	}
}

// TestSubmitAndFetchUseDistinctSpans keeps the o11y contract: a billed submit and a
// free read-back must be tellable apart in a trace without reading the span payload.
func TestSubmitAndFetchUseDistinctSpans(t *testing.T) {
	server, _ := newServer(t, http.StatusOK, `{"job_ref":"snap_1","status":"COMPLETED"}`)

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))

	previous := otel.GetTracerProvider()

	otel.SetTracerProvider(provider)
	t.Cleanup(func() { otel.SetTracerProvider(previous) })

	extractor, err := snaptojson.New(server.URL, "k", 5*time.Second)
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	if _, err := extractor.Submit(t.Context(), snaptojson.Artifact{Bytes: []byte("x")}); err != nil {
		t.Fatalf("submit: %v", err)
	}

	if _, err := extractor.Fetch(t.Context(), "snap_1"); err != nil {
		t.Fatalf("fetch: %v", err)
	}

	seen := map[string]bool{}
	for _, ended := range recorder.Ended() {
		seen[ended.Name()] = true
	}

	for _, want := range []string{"Repository.Snaptojson.Posting", "Repository.Snaptojson.Polling"} {
		if !seen[want] {
			t.Fatalf("span %q missing; got %v", want, seen)
		}
	}
}
