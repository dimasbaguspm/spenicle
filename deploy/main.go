package main

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

func spaHandler(root http.FileSystem) http.Handler {
	fs := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := root.Open(r.URL.Path)
		if os.IsNotExist(err) {
			r.URL.Path = "/"
		}
		fs.ServeHTTP(w, r)
	})
}

func startBackend() error {
	backendPath := os.Getenv("BACKEND_PATH")

	if _, err := os.Stat(backendPath); err == nil {
		cmd := exec.Command(backendPath)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		err = cmd.Start()
		if err != nil {
			return err
		}
		// Wait for backend to be ready
		time.Sleep(1 * time.Second) // Initial wait
		for i := 0; i < 60; i++ {   // Increased timeout to 60 seconds
			conn, err := net.Dial("tcp", "127.0.0.1:8080")
			if err == nil {
				conn.Close()
				return nil
			}
			time.Sleep(1 * time.Second)
		}
		return fmt.Errorf("backend failed to start within timeout")
	}
	return nil // No backend to start
}

func startProxy() {
	apiURL, _ := url.Parse("http://127.0.0.1:8080")
	proxy := httputil.NewSingleHostReverseProxy(apiURL)

	srv := http.NewServeMux()

	srv.Handle("/api/", http.StripPrefix("/api", proxy))
	srv.Handle("/openapi.json", httputil.NewSingleHostReverseProxy(apiURL))

	// Serve static files from frontend dist with SPA fallback
	distPath := os.Getenv("DIST_PATH")
	if distPath == "" {
		exePath, err := os.Executable()
		if err != nil {
			panic(err)
		}
		exeDir := filepath.Dir(exePath)
		distPath = filepath.Clean(filepath.Join(exeDir, "../../apps/frontend-web/dist"))
	}
	srv.Handle("/", spaHandler(http.Dir(distPath)))

	http.ListenAndServe(":3000", srv)
}

func main() {
	if err := startBackend(); err != nil {
		panic(err)
	}
	startProxy()
}
