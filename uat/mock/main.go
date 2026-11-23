// Package main is the containerised stand-in for the SnapToJSON partner route. The UAT
// suite points the real adapter at it, so the wire contract is exercised without a
// vendor account.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	addr        = ":8080"
	jobRef      = "snap_container_1"
	bearerCheck = "Bearer "
	maxMemory   = 1 << 20
	maxBody     = 1 << 20
	readHeader  = 5 * time.Second
)

type health struct {
	Status string `json:"status"`
}

type violation struct {
	Pointer string `json:"pointer"`
	Error   string `json:"error"`
}

type snapResult struct {
	Data       map[string]string `json:"data"`
	Valid      bool              `json:"valid"`
	Violations []violation       `json:"violations"`
}

type snapReport struct {
	JobRef string      `json:"job_ref"`
	Status string      `json:"status"`
	Result *snapResult `json:"result,omitempty"`
	Error  string      `json:"error_message"`
}

func completedReport() snapReport {
	return snapReport{
		JobRef: jobRef,
		Status: "COMPLETED",
		Result: &snapResult{
			Data:       map[string]string{"total": "25000", "merchant": "KOPI KENANGAN"},
			Valid:      true,
			Violations: []violation{},
		},
	}
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

	mux.HandleFunc("POST /partner/v1/snaps", handleSnaps)

	return mux
}

func handleSnaps(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.Header.Get("Authorization"), bearerCheck) {
		httpx.WriteError(w, http.StatusUnauthorized, "missing_api_key", "no key")

		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBody)

	if err := r.ParseMultipartForm(maxMemory); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_body", "file or snap_id")

		return
	}

	if r.MultipartForm != nil && len(r.MultipartForm.Value["snap_id"]) > 0 {
		httpx.WriteJSON(w, http.StatusOK, completedReport())

		return
	}

	if _, _, err := r.FormFile("file"); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_body", "file or snap_id")

		return
	}

	httpx.WriteJSON(w, http.StatusAccepted, snapReport{JobRef: jobRef, Status: "EXECUTING"})
}
