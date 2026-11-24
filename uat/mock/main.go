// Package main is the containerised stand-in for the outside services. The UAT suite
// points the real adapters at it, so the wire contracts are exercised without a vendor
// account. One file per mocked service, each with a broken twin so a scenario can prove
// what happens when the partner answers 503 or breaks its contract.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	addr       = ":8080"
	readHeader = 5 * time.Second

	maxMemory   = 1 << 20
	maxBody     = 1 << 20
	bearerCheck = "Bearer "

	jsonType = "application/json; charset=utf-8"
	xmlType  = "application/xml; charset=utf-8"
)

type health struct {
	Status string `json:"status"`
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	if err := serve(); err != nil {
		logger.ErrorContext(context.Background(), "mock vendor stopped", slog.Any("error", err))
		os.Exit(1)
	}
}

func serve() error {
	server := &http.Server{
		Addr:              addr,
		Handler:           newMux(),
		ReadHeaderTimeout: readHeader,
	}

	if err := server.ListenAndServe(); err != nil {
		return fmt.Errorf("server the mock vendor: %w", err)
	}

	return nil
}

func newMux() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, health{Status: "ok"})
	})

	registerSnapToJSON(mux)
	registerOpenAI(mux)
	registerECB(mux)
	registerGoogle(mux)

	return mux
}

func handleDown(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteError(w, http.StatusServiceUnavailable, "vendor_unavailable", "the partner is down")
}
