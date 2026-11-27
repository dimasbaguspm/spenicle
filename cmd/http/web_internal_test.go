package httpcmd

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

type webWant struct {
	name       string
	method     string
	path       string
	handled    bool
	status     int
	body       string
	cache      string
	contentTyp string
}

func webAssetsFixture() fstest.MapFS {
	return fstest.MapFS{
		"index.html":             {Data: []byte("<!doctype html>shell")},
		"sw.js":                  {Data: []byte("self.addEventListener('install')")},
		"assets/index-a1b2c3.js": {Data: []byte("console.log(1)")},
	}
}

func TestWebAssets(t *testing.T) {
	tests := []webWant{
		{
			name:    "the root serves the shell",
			method:  http.MethodGet,
			path:    "/",
			handled: true,
			status:  http.StatusOK,
			body:    "<!doctype html>shell",
			cache:   "no-cache",
		},
		{
			name:    "a client route falls back to the shell",
			method:  http.MethodGet,
			path:    "/ledger/2026-02",
			handled: true,
			status:  http.StatusOK,
			body:    "<!doctype html>shell",
			cache:   "no-cache",
		},
		{
			name:       "a hashed asset is cached forever",
			method:     http.MethodGet,
			path:       "/assets/index-a1b2c3.js",
			handled:    true,
			status:     http.StatusOK,
			body:       "console.log(1)",
			cache:      "public, max-age=31536000, immutable",
			contentTyp: "text/javascript; charset=utf-8",
		},
		{
			name:    "a missing asset is a 404, not the shell",
			method:  http.MethodGet,
			path:    "/assets/gone-a1b2c3.js",
			handled: true,
			status:  http.StatusNotFound,
			body:    "404 page not found\n",
		},
		{
			name:    "the api keeps its own 404",
			method:  http.MethodGet,
			path:    "/api/entries",
			handled: false,
		},
		{
			name:    "healthz is never the shell",
			method:  http.MethodGet,
			path:    "/healthz",
			handled: false,
		},
		{
			name:    "a write is not the shell",
			method:  http.MethodPost,
			path:    "/ledger",
			handled: false,
		},
		{
			name:    "head answers without a body",
			method:  http.MethodHead,
			path:    "/assets/index-a1b2c3.js",
			handled: true,
			status:  http.StatusOK,
			cache:   "public, max-age=31536000, immutable",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rw := httptest.NewRecorder()
			handled := newWebAssets(webAssetsFixture()).try(
				rw, httptest.NewRequest(tc.method, tc.path, http.NoBody))

			if handled != tc.handled {
				t.Fatalf("handled = %v, want %v", handled, tc.handled)
			}

			if tc.handled {
				checkWebResponse(t, rw, tc)
			}
		})
	}
}

func checkWebResponse(t *testing.T, rw *httptest.ResponseRecorder, want webWant) {
	t.Helper()

	if rw.Code != want.status {
		t.Fatalf("status = %d, want %d", rw.Code, want.status)
	}

	if rw.Body.String() != want.body {
		t.Fatalf("body = %q, want %q", rw.Body.String(), want.body)
	}

	if want.cache != "" && rw.Header().Get("Cache-Control") != want.cache {
		t.Fatalf("cache = %q, want %q", rw.Header().Get("Cache-Control"), want.cache)
	}

	if want.contentTyp != "" && rw.Header().Get("Content-Type") != want.contentTyp {
		t.Fatalf("content type = %q, want %q", rw.Header().Get("Content-Type"), want.contentTyp)
	}
}

func TestWebAssetsAbsent(t *testing.T) {
	rw := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", http.NoBody)

	if newWebAssets(nil).try(rw, r) {
		t.Fatal("a binary built without the tag must serve nothing")
	}
}
