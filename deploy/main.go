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

// serverConfig holds configuration for starting a server-side app
type serverConfig struct {
	name        string
	binaryPath  string
	port        string
	timeout     int // seconds
	envOverride map[string]string
}

// startServerApp is a generic utility to start any server-side application
func startServerApp(cfg serverConfig) error {
	if _, err := os.Stat(cfg.binaryPath); err != nil {
		return nil
	}

	cmd := exec.Command(cfg.binaryPath)

	// Apply environment overrides
	if len(cfg.envOverride) > 0 {
		env := os.Environ()
		for key, val := range cfg.envOverride {
			env = append(env, fmt.Sprintf("%s=%s", key, val))
		}
		cmd.Env = env
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start %s: %w", cfg.name, err)
	}

	// Wait for server to be ready
	time.Sleep(1 * time.Second)
	for i := 0; i < cfg.timeout; i++ {
		conn, err := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%s", cfg.port))
		if err == nil {
			conn.Close()
			fmt.Printf("%s ready on port %s\n", cfg.name, cfg.port)
			return nil
		}
		time.Sleep(1 * time.Second)
	}

	return fmt.Errorf("%s failed to start within %ds timeout", cfg.name, cfg.timeout)
}

// spaHandler serves the React SPA with fallback to index.html
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

// proxyWithIPForwarding creates a reverse proxy that forwards client IP headers
func proxyWithIPForwarding(target *url.URL) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)

		clientIP := req.RemoteAddr
		if host, _, err := net.SplitHostPort(clientIP); err == nil {
			clientIP = host
		}

		if prior := req.Header.Get("X-Forwarded-For"); prior != "" {
			clientIP = prior + ", " + clientIP
		}
		req.Header.Set("X-Forwarded-For", clientIP)

		if req.Header.Get("X-Real-IP") == "" {
			req.Header.Set("X-Real-IP", clientIP)
		}

		if req.TLS != nil {
			req.Header.Set("X-Forwarded-Proto", "https")
		} else {
			req.Header.Set("X-Forwarded-Proto", "http")
		}
	}

	return proxy
}

func startProxy() {
	apiURL, _ := url.Parse("http://127.0.0.1:8080")
	apiProxy := proxyWithIPForwarding(apiURL)

	srv := http.NewServeMux()

	srv.Handle("/api/", http.StripPrefix("/api", apiProxy))
	srv.Handle("/openapi.json", apiProxy)

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

	fmt.Println("Proxy server starting on :3000")
	http.ListenAndServe(":3000", srv)
}

func main() {
	snapExchangePort := os.Getenv("SNAPEXCHANGE_PORT")

	if err := startServerApp(serverConfig{
		name:       "SnapExchange",
		binaryPath: os.Getenv("SNAPEXCHANGE_PATH"),
		port:       snapExchangePort,
		timeout:    30,
		envOverride: map[string]string{
			"APP_PORT": snapExchangePort,
		},
	}); err != nil {
		panic(err)
	}

	if err := startServerApp(serverConfig{
		name:       "Backend",
		binaryPath: os.Getenv("BACKEND_PATH"),
		port:       "8080",
		timeout:    60,
	}); err != nil {
		panic(err)
	}

	startProxy()
}
