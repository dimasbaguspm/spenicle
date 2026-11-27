// Package httpx encapsulates the HTTP mechanics every handler and middleware
// needs: one JSON envelope for success, one for failure, and a recorder that
// lets an outer layer see what an inner one answered. No route, no business
// rule, no domain type.
package httpx

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type Middleware func(http.Handler) http.Handler

func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	for index := len(middlewares) - 1; index >= 0; index-- {
		handler = middlewares[index](handler)
	}

	return handler
}

type Recorder struct {
	http.ResponseWriter

	Status int
	Bytes  int
}

func (r *Recorder) WriteHeader(code int) {
	r.Status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *Recorder) Write(body []byte) (int, error) {
	if r.Status == 0 {
		r.Status = http.StatusOK
	}

	written, err := r.ResponseWriter.Write(body)
	r.Bytes += written

	if err != nil {
		return written, fmt.Errorf("write response: %w", err)
	}

	return written, nil
}

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, `{"error":{"code":"internal_error","message":"encode failed"}}`,
			http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(append(body, '\n'))
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	TraceID string `json:"trace_id,omitempty"`
}

type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

func WriteServerError(w http.ResponseWriter, message, traceID string) {
	var body ErrorBody

	body.Error.Code = "internal_error"
	body.Error.Message = message
	body.Error.TraceID = traceID

	WriteJSON(w, http.StatusInternalServerError, body)
}

func WriteError(w http.ResponseWriter, status int, code, message string) {
	var body ErrorBody

	body.Error.Code = code
	body.Error.Message = message

	WriteJSON(w, status, body)
}

type requestIDKey struct{}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)

	return id
}
