package main

import (
	"io"
	"net/http"
	"strings"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	snapsPath        = "/partner/v1/snaps"
	snapsDownPath    = "/partner/v1/down"
	snapsBrokenPath  = "/partner/v1/malformed"
	jobRef           = "snap_container_1"
	truncatedReport  = `{"job_ref":"snap_container_1","status":"COMPLETED","result":{"data":`
	snapsReportReady = "EXECUTING"
)

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

func registerSnapToJSON(mux *http.ServeMux) {
	mux.HandleFunc("POST "+snapsPath, handleSnaps)
	mux.HandleFunc("POST "+snapsDownPath, handleDown)
	mux.HandleFunc("POST "+snapsBrokenPath, handleBrokenSnaps)
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

func handleSnaps(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.Header.Get("Authorization"), bearerCheck) {
		httpx.WriteError(w, http.StatusUnauthorized, "missing_api_key", "no key")

		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBody)

	//nolint:gosec // G120: r.Body is capped by the MaxBytesReader above.
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

	httpx.WriteJSON(w, http.StatusAccepted, snapReport{JobRef: jobRef, Status: snapsReportReady})
}

func handleBrokenSnaps(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", jsonType)
	_, _ = io.WriteString(w, truncatedReport)
}
