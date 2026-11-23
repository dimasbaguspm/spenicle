// Package httpx encapsulates the HTTP mechanics every handler and middleware
// needs: one JSON envelope for success, one for failure, and a recorder that
// lets an outer layer see what an inner one answered. No route, no business
// rule, no domain type.
package httpx

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// Middleware is the shape this package and cmd/http/middlewares agree on.
type Middleware func(http.Handler) http.Handler

// Chain applies middleware so the first argument is the outermost layer.
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	for index := len(middlewares) - 1; index >= 0; index-- {
		handler = middlewares[index](handler)
	}

	return handler
}

// Recorder remembers the status and size so middleware can log or annotate.
type Recorder struct {
	http.ResponseWriter

	Status int
	Bytes  int
}

// WriteHeader records the status before forwarding it.
func (r *Recorder) WriteHeader(code int) {
	r.Status = code
	r.ResponseWriter.WriteHeader(code)
}

// Write records the size before forwarding it.
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

// WriteJSON marshals first, so a failed encode never leaves a half-written body.
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

// ErrorBody is the envelope every failure uses.
type ErrorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// WriteError answers with the project's error envelope.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	var body ErrorBody

	body.Error.Code = code
	body.Error.Message = message

	WriteJSON(w, status, body)
}
