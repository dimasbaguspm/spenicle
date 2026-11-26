package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	tests := []struct {
		name          string
		origin        string
		method        string
		wantStatus    int
		wantOrigin    string
		wantNextCalls int
	}{
		{
			name:       "preflight allows a browser origin",
			origin:     "https://app.example.com",
			method:     http.MethodOptions,
			wantStatus: http.StatusNoContent,
			wantOrigin: "https://app.example.com",
		},
		{
			name:          "actual request reaches the handler",
			origin:        "http://localhost:3000",
			method:        http.MethodGet,
			wantStatus:    http.StatusOK,
			wantOrigin:    "http://localhost:3000",
			wantNextCalls: 1,
		},
		{
			name:       "origin with a path is refused",
			origin:     "https://app.example.com/path",
			method:     http.MethodOptions,
			wantStatus: http.StatusNoContent,
		},
		{
			name:          "request without an origin is unchanged",
			method:        http.MethodGet,
			wantStatus:    http.StatusOK,
			wantNextCalls: 1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				calls++
				w.WriteHeader(http.StatusOK)
			})
			request := httptest.NewRequestWithContext(t.Context(), tc.method, "/healthz", nil)
			if tc.origin != "" {
				request.Header.Set("Origin", tc.origin)
			}

			recorder := httptest.NewRecorder()
			CORS()(next).ServeHTTP(recorder, request)

			if recorder.Code != tc.wantStatus {
				t.Fatalf("status is %d, want %d", recorder.Code, tc.wantStatus)
			}
			if calls != tc.wantNextCalls {
				t.Fatalf("next called %d times, want %d", calls, tc.wantNextCalls)
			}
			if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != tc.wantOrigin {
				t.Fatalf("allow-origin is %q, want %q", got, tc.wantOrigin)
			}
			if tc.wantOrigin != "" {
				assertCORSHeaders(t, recorder.Header())
			}
		})
	}
}

func assertCORSHeaders(t *testing.T, headers http.Header) {
	t.Helper()

	if got := headers.Get("Vary"); got != "Origin" {
		t.Errorf("vary is %q, want Origin", got)
	}
	if got := headers.Get("Access-Control-Allow-Methods"); got != "GET, POST, PATCH, OPTIONS" {
		t.Errorf("allow-methods is %q", got)
	}
	if got := headers.Get("Access-Control-Allow-Headers"); got != "Authorization, Content-Type" {
		t.Errorf("allow-headers is %q", got)
	}
	if got := headers.Get("Access-Control-Expose-Headers"); got != "Content-Disposition" {
		t.Errorf("expose-headers is %q", got)
	}
	if got := headers.Get("Access-Control-Max-Age"); got != "600" {
		t.Errorf("max-age is %q", got)
	}
}
