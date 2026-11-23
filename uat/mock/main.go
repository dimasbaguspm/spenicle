// Package main is the containerised stand-in for the outside services. The UAT suite
// points the real adapters at it, so the wire contracts are exercised without a vendor
// account, and every route has a broken twin so a scenario can prove what happens when
// the partner answers 503.
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
	xmlType     = "application/xml; charset=utf-8"

	snapsPath        = "/partner/v1/snaps"
	snapsDownPath    = "/partner/v1/down"
	snapsBrokenPath  = "/partner/v1/malformed"
	ratesPath        = "/stats/eurofxref/eurofxref-daily.xml"
	ratesDownPath    = "/stats/eurofxref/down.xml"
	ratesBrokenPath  = "/stats/eurofxref/malformed.xml"
	openAIPath       = "/v1/ok/chat/completions"
	openAIDownPath   = "/v1/down/chat/completions"
	openAIBrokenPath = "/v1/malformed/chat/completions"
	openAIAnswer     = `{"total":"25000","merchant":"KOPI KENANGAN"}`
	openAIBabble     = "Sorry, I cannot read this receipt."
)

const (
	jsonType        = "application/json; charset=utf-8"
	truncatedReport = `{"job_ref":"snap_container_1","status":"COMPLETED","result":{"data":`
	truncatedSheet  = `<?xml version="1.0" encoding="UTF-8"?><gesmes:Envelope
  xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"><Cube><Cube time="2026-11-20">`
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

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChoice struct {
	Index        int           `json:"index"`
	Message      openAIMessage `json:"message"`
	FinishReason string        `json:"finish_reason"`
}

type openAICompletion struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []openAIChoice `json:"choices"`
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

	mux.HandleFunc("POST "+snapsPath, handleSnaps)
	mux.HandleFunc("POST "+snapsDownPath, handleDown)
	mux.HandleFunc("POST "+snapsBrokenPath, handleBrokenSnaps)

	mux.HandleFunc("POST "+openAIPath, handleOpenAI)
	mux.HandleFunc("POST "+openAIDownPath, handleDown)
	mux.HandleFunc("POST "+openAIBrokenPath, handleBabble)

	mux.HandleFunc("GET "+ratesPath, handleRates)
	mux.HandleFunc("GET "+ratesDownPath, handleDown)
	mux.HandleFunc("GET "+ratesBrokenPath, handleBrokenRates)

	return mux
}

func handleDown(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteError(w, http.StatusServiceUnavailable, "vendor_unavailable", "the partner is down")
}

func handleBrokenRates(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", xmlType)
	_, _ = io.WriteString(w, truncatedSheet)
}

func handleBrokenSnaps(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", jsonType)
	_, _ = io.WriteString(w, truncatedReport)
}

func handleOpenAI(w http.ResponseWriter, _ *http.Request) {
	writeAnswer(w, openAIAnswer)
}

func handleBabble(w http.ResponseWriter, _ *http.Request) {
	writeAnswer(w, openAIBabble)
}

func writeAnswer(w http.ResponseWriter, content string) {
	httpx.WriteJSON(w, http.StatusOK, openAICompletion{
		ID:      "chatcmpl-uat",
		Object:  "chat.completion",
		Created: 1,
		Model:   "gpt-4o-mini",
		Choices: []openAIChoice{{
			Index:        0,
			Message:      openAIMessage{Role: "assistant", Content: content},
			FinishReason: "stop",
		}},
	})
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
