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

	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/snaptojson"
)

type captured struct {
	apiKey   string
	fileName string
	fileBody string
	snapID   string
}

func newServer(t *testing.T, status int, body string) (*httptest.Server, *captured) {
	t.Helper()

	seen := &captured{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen.apiKey = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

		mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || mediaType != "multipart/form-data" {
			t.Errorf("content type = %q, want multipart/form-data", r.Header.Get("Content-Type"))
		}

		reader := multipart.NewReader(r.Body, params["boundary"])
		for {
			part, partErr := reader.NextPart()
			if errors.Is(partErr, io.EOF) {
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

func TestSubmitSendsTheDocumentedShapeAndUnifies(t *testing.T) {
	server, seen := newServer(t, http.StatusOK, `{
		"job_ref":"snap_123",
		"status":"COMPLETED",
		"result":{"data":{"total":"25000"},"valid":true,"violations":[]},
		"error_message":""
	}`)

	rail, err := snaptojson.New(server.URL, "project-key", 5*time.Second)
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	if rail.Rail() != "snaptojson" {
		t.Fatalf("rail = %q", rail.Rail())
	}

	report, err := rail.Submit(t.Context(), extraction.Artifact{
		Filename:    "receipt.jpg",
		ContentType: "image/jpeg",
		Bytes:       []byte("jpeg bytes"),
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}

	if seen.apiKey != "project-key" {
		t.Fatalf("authorization = %q", seen.apiKey)
	}

	if seen.fileName != "receipt.jpg" || seen.fileBody != "jpeg bytes" {
		t.Fatalf("file part = %q / %q", seen.fileName, seen.fileBody)
	}

	if report.Rail != "snaptojson" || report.Status != extraction.StatusCompleted {
		t.Fatalf("report = %+v", report)
	}

	if !report.Valid {
		t.Fatal("a valid vendor result must stay valid after unification")
	}

	if got := string(report.Data); got != `{"total":"25000"}` {
		t.Fatalf("data = %s", got)
	}
}

func TestSubmitReturnsARunningReport(t *testing.T) {
	server, _ := newServer(t, http.StatusAccepted, `{"job_ref":"snap_456","status":"EXECUTING"}`)

	rail, _ := snaptojson.New(server.URL, "k", 5*time.Second)

	report, err := rail.Submit(t.Context(), extraction.Artifact{Bytes: []byte("x")})
	if err != nil {
		t.Fatalf("202 is not an error: %v", err)
	}

	if report.Status != extraction.StatusRunning || report.JobRef != "snap_456" {
		t.Fatalf("report = %+v", report)
	}
}

func TestPollPostsSnapIDAndKeepsViolations(t *testing.T) {
	server, seen := newServer(t, http.StatusOK, `{"job_ref":"snap_789","status":"COMPLETED",
		"result":{"data":{},"valid":false,"violations":[{"pointer":"/total","error":"required"}]}}`)

	rail, _ := snaptojson.New(server.URL, "k", 5*time.Second)

	report, err := rail.Poll(t.Context(), "snap_789")
	if err != nil {
		t.Fatalf("poll: %v", err)
	}

	if seen.snapID != "snap_789" || seen.fileName != "" {
		t.Fatalf("read-back must send snap_id only, got snap_id=%q file=%q", seen.snapID, seen.fileName)
	}

	if report.Valid || len(report.Violations) != 1 || report.Violations[0].Pointer != "/total" {
		t.Fatalf("violations = %+v", report)
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

			rail, _ := snaptojson.New(server.URL, "k", 5*time.Second)

			_, err := rail.Submit(t.Context(), extraction.Artifact{Bytes: []byte("x")})

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

func TestPostingAndPollingUseDistinctSpans(t *testing.T) {
	server, _ := newServer(t, http.StatusOK, `{"job_ref":"snap_1","status":"COMPLETED"}`)

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))

	previous := otel.GetTracerProvider()

	otel.SetTracerProvider(provider)
	t.Cleanup(func() { otel.SetTracerProvider(previous) })

	rail, _ := snaptojson.New(server.URL, "k", 5*time.Second)

	if _, err := rail.Submit(t.Context(), extraction.Artifact{Bytes: []byte("x")}); err != nil {
		t.Fatalf("submit: %v", err)
	}

	if _, err := rail.Poll(t.Context(), "snap_1"); err != nil {
		t.Fatalf("poll: %v", err)
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
