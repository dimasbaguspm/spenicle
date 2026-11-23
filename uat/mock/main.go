// Package main is the containerised stand-in for the SnapToJSON partner route. The UAT
// suite points the real adapter at it, so the wire contract is exercised without a
// vendor account.
package main

import (
	"context"
	"fmt"
	"io"
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
	ratesPath   = "/stats/eurofxref/eurofxref-daily.xml"
	xmlType     = "application/xml; charset=utf-8"
)

const ratesSheet = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope
  xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
  xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender>
    <gesmes:name>European Central Bank</gesmes:name>
  </gesmes:Sender>
  <Cube>
    <Cube time="2026-11-20">
      <Cube currency="USD" rate="1.0990"/>
      <Cube currency="JPY" rate="174.35"/>
      <Cube currency="IDR" rate="16000.50"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

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

	mux.HandleFunc("GET "+ratesPath, handleRates)

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

func handleRates(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", xmlType)
	_, _ = io.WriteString(w, ratesSheet)
}
