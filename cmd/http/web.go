package httpcmd

import (
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
)

// webAssets answers what the API does not own with the embedded SPA: the file when the path
// names one, the shell otherwise, so a client-side route survives a reload.
type webAssets struct {
	files fs.FS
}

func newWebAssets(files fs.FS) *webAssets {
	return &webAssets{files: files}
}

// try answers the request and reports whether it did. Anything under /api/ or /healthz is
// left alone, which is what keeps an unknown endpoint a JSON 404 instead of the shell.
func (w *webAssets) try(rw http.ResponseWriter, r *http.Request) bool {
	if w == nil || w.files == nil {
		return false
	}

	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}

	if r.URL.Path == "/api" || strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/healthz" {
		return false
	}

	name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if name == "" {
		name = "index.html"
	}

	if w.serve(rw, r, name) {
		return true
	}

	// a missing path with an extension is a missing asset, never a route to the shell
	if path.Ext(name) != "" {
		http.NotFound(rw, r)

		return true
	}

	return w.serve(rw, r, "index.html")
}

func (w *webAssets) serve(rw http.ResponseWriter, r *http.Request, name string) bool {
	info, err := fs.Stat(w.files, name)
	if err != nil || info.IsDir() {
		return false
	}

	body, err := fs.ReadFile(w.files, name)
	if err != nil {
		return false
	}

	if contentType := mime.TypeByExtension(path.Ext(name)); contentType != "" {
		rw.Header().Set("Content-Type", contentType)
	}

	// Vite fingerprints everything under /assets/, so it can be cached forever; the shell and
	// the service worker must revalidate or an install would pin an old build.
	if strings.HasPrefix(name, "assets/") {
		rw.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		rw.Header().Set("Cache-Control", "no-cache")
	}

	rw.WriteHeader(http.StatusOK)

	if r.Method != http.MethodHead {
		//nolint:gosec // the bytes are this build's own embedded assets, never user input
		_, _ = rw.Write(body)
	}

	return true
}
