package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const healthTimeout = 2 * time.Second

type healthResponse struct {
	Status        string `json:"status"`
	Version       string `json:"version"`
	SchemaVersion int    `json:"schema_version"`
	AppSecret     string `json:"app_secret"`
	BaseCurrency  string `json:"base_currency"`
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), healthTimeout)
	defer cancel()

	schemaVersion, err := s.deps.Health.SchemaVersion(ctx)
	if err == nil {
		err = s.deps.Health.Ping(ctx)
	}

	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "degraded", err.Error())

		return
	}

	httpx.WriteJSON(w, http.StatusOK, healthResponse{
		Status:        "ok",
		Version:       s.deps.Version,
		SchemaVersion: schemaVersion,
		AppSecret:     s.deps.Sealer.Fingerprint(),
		BaseCurrency:  s.deps.BaseCurrency,
	})
}
