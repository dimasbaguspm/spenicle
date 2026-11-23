package openai_test

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction/openai"
)

func newVendor(t *testing.T, content string) (*httptest.Server, map[string]any) {
	t.Helper()

	seen := map[string]any{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("path = %q, want /chat/completions", r.URL.Path)
		}

		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &seen)

		response := map[string]any{
			"id":      "chatcmpl-1",
			"object":  "chat.completion",
			"created": 1,
			"model":   "gpt-4o-mini",
			"choices": []any{map[string]any{
				"index":         0,
				"finish_reason": "stop",
				"message":       map[string]any{"role": "assistant", "content": content},
			}},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}))

	t.Cleanup(server.Close)

	return server, seen
}

func TestSubmitParsesTheModelAnswer(t *testing.T) {
	server, seen := newVendor(t, `{"total":"25000","currency":"IDR","merchant":"KOPI KENANGAN"}`)

	rail, err := openai.New("sk-test", "gpt-4o-mini", server.URL, 5*time.Second)
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	if rail.Rail() != "openai" {
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

	if report.Rail != "openai" || report.Status != extraction.StatusCompleted || !report.Valid {
		t.Fatalf("report = %+v", report)
	}

	var fields map[string]string
	if decodeErr := json.Unmarshal(report.Data, &fields); decodeErr != nil {
		t.Fatalf("data is not an object: %v", decodeErr)
	}

	if fields["merchant"] != "KOPI KENANGAN" {
		t.Fatalf("fields = %v", fields)
	}

	if seen["model"] != "gpt-4o-mini" {
		t.Fatalf("model sent = %v", seen["model"])
	}

	encoded, err := json.Marshal(seen["messages"])
	if err != nil {
		t.Fatalf("encode messages: %v", err)
	}

	if !strings.Contains(string(encoded), "data:image/jpeg;base64,") {
		t.Fatalf("the image must be sent as a data URL, got %.120s", encoded)
	}
}

func TestSubmitToleratesAFencedAnswer(t *testing.T) {
	server, _ := newVendor(t, "```json\n{\"total\":\"1000\"}\n```")

	rail, _ := openai.New("sk-test", "gpt-4o-mini", server.URL, 5*time.Second)

	report, err := rail.Submit(t.Context(), extraction.Artifact{Bytes: []byte("x")})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}

	if string(report.Data) != `{"total":"1000"}` {
		t.Fatalf("data = %s", report.Data)
	}
}

func TestSubmitRejectsANonJSONAnswer(t *testing.T) {
	server, _ := newVendor(t, "I could not read this receipt.")

	rail, _ := openai.New("sk-test", "gpt-4o-mini", server.URL, 5*time.Second)

	if _, err := rail.Submit(t.Context(), extraction.Artifact{Bytes: []byte("x")}); err == nil {
		t.Fatal("prose instead of JSON must be refused, not stored as a draft")
	}
}

func TestPollReportsThatThereIsNothingToPoll(t *testing.T) {
	rail, err := openai.New("sk-test", "gpt-4o-mini", "", 5*time.Second)
	if err != nil {
		t.Fatalf("new: %v", err)
	}

	_, err = rail.Poll(t.Context(), "anything")

	if !errors.Is(err, extraction.ErrNoPolling) {
		t.Fatalf("err = %v, want ErrNoPolling", err)
	}
}

func TestNewRefusesAnEmptyKey(t *testing.T) {
	if _, err := openai.New("", "gpt-4o-mini", "", time.Second); err == nil {
		t.Fatal("the rail has no anonymous mode")
	}
}
