package handlers

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const codeInternal = "internal_error"

func (s *Server) writeClassified(ctx context.Context, w http.ResponseWriter, err error) {
	status, code := classify(err)

	if status == http.StatusInternalServerError {
		s.InternalError(ctx, w, err)

		return
	}

	httpx.WriteError(w, status, code, err.Error())
}

func (s *Server) InternalError(ctx context.Context, w http.ResponseWriter, err error) {
	s.deps.Logger.ErrorContext(ctx, "request failed", slog.String("error", err.Error()))
	httpx.WriteError(w, http.StatusInternalServerError, codeInternal, "internal error")
}
