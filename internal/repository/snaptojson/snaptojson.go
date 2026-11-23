// Package snaptojson is the adapter for the extraction vendor. Contract source:
// https://snaptojson.com/docs/api — one partner route, one verb:
//
//	POST {endpoint}                       submit a file, or read a snap back
//	Authorization: Bearer <project key>   the only credential
//	multipart/form-data                   file=<bytes> or snap_id=<job_ref>
//
// Answers 200 (terminal SnapReport), 202 (still running, post the id back) or an
// ErrorEnvelope. The vendor owns its schema; this package only knows how to hand it
// bytes and hand back the envelope the capture queue stores.
//
// It is deliberately inert until an API key is configured: with no key, captures
// stay raw and the user types the fields, which is the honest default for a
// self-hosted box.
package snaptojson

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

// ErrNotConfigured reports that no API key was supplied.
var ErrNotConfigured = errors.New("extraction provider is not configured")

const (
	// maxArtifactBytes is the vendor's hard limit: 10 MiB, refused before reading.
	maxArtifactBytes = 10 << 20
	// maxErrorBody bounds what an error response can make us allocate.
	maxErrorBody = 64 << 10
)

// Extractor is the contract the capture module depends on. A local model, a
// different vendor, or a stub in tests all satisfy it.
type Extractor interface {
	// Submit posts the artifact and returns the vendor's report. A 202 is not an
	// error: it means "still running", and JobRef is how to read it back.
	Submit(ctx context.Context, artifact Artifact) (Report, error)
	// Fetch reads a snap back by its JobRef.
	Fetch(ctx context.Context, jobRef string) (Report, error)
}

// Artifact is one document on its way to the vendor.
type Artifact struct {
	Filename    string
	ContentType string
	Bytes       []byte
}

// Report is SnapReport: the body of a submit and of every read-back.
type Report struct {
	JobRef string `json:"job_ref"`
	// Status is REGISTERED, EXECUTING, COMPLETED or FAILED. Only the last two are
	// terminal.
	Status       string  `json:"status"`
	Result       *Result `json:"result"`
	ErrorMessage string  `json:"error_message"`
}

// Result is SnapResult: what the reader answered. Valid=false is an answer, not a
// failure, and comes with violations.
type Result struct {
	Data       json.RawMessage `json:"data"`
	Valid      bool            `json:"valid"`
	Violations []Violation     `json:"violations"`
}

// Violation is one field the document did not satisfy, named the way JSON Schema
// names it.
type Violation struct {
	Pointer string `json:"pointer"`
	Error   string `json:"error"`
}

// APIError is the vendor's ErrorEnvelope, unwrapped. Code is stable; Message is for
// a log, never for parsing.
type APIError struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error renders the vendor's words, prefixed with the HTTP status.
func (e *APIError) Error() string {
	return fmt.Sprintf("snaptojson: %d %s: %s", e.Status, e.Code, e.Message)
}

// Client is the HTTP adapter. Zero value is unusable; construct with New.
type Client struct {
	endpoint string
	apiKey   string
	http     *http.Client
}

// New returns an extractor, or ErrNotConfigured when the key is empty.
func New(endpoint, apiKey string, timeout time.Duration) (Extractor, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, ErrNotConfigured
	}

	if strings.TrimSpace(endpoint) == "" {
		return nil, errors.New("extraction endpoint is required")
	}

	return &Client{
		endpoint: endpoint,
		apiKey:   apiKey,
		http:     &http.Client{Timeout: timeout},
	}, nil
}

// Submit posts one file. A 202 report is returned as a report, not an error: the
// caller stores JobRef and reads it back later.
func (c *Client) Submit(ctx context.Context, artifact Artifact) (Report, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Snaptojson.Submit")
	defer endSpan()

	if len(artifact.Bytes) == 0 {
		return Report{}, errors.New("snaptojson: empty artifact")
	}

	if len(artifact.Bytes) > maxArtifactBytes {
		return Report{}, &APIError{
			Status: http.StatusRequestEntityTooLarge, Code: "image_too_large",
			Message: "artifact is over 10 MiB",
		}
	}

	filename := artifact.Filename
	if filename == "" {
		filename = "artifact"
	}

	contentType := artifact.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return c.post(ctx, func(writer *multipart.Writer) error {
		part, err := writer.CreatePart(filePart(filename, contentType))
		if err != nil {
			return fmt.Errorf("snaptojson: form part: %w", err)
		}

		if _, err = part.Write(artifact.Bytes); err != nil {
			return fmt.Errorf("snaptojson: write part: %w", err)
		}

		return nil
	})
}

// Fetch reads a snap back by id. This is how a 202 is polled and how a retry works:
// the vendor is charged once, the read-back is free.
func (c *Client) Fetch(ctx context.Context, jobRef string) (Report, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Snaptojson.Fetch")
	defer endSpan()

	if strings.TrimSpace(jobRef) == "" {
		return Report{}, errors.New("snaptojson: job_ref is required")
	}

	return c.post(ctx, func(writer *multipart.Writer) error {
		return writer.WriteField("snap_id", jobRef)
	})
}

// post sends one multipart request and decodes either a report or an error
// envelope. One request shape for both halves of the contract is what keeps this
// adapter honest to the vendor's "one route, one verb".
func (c *Client) post(
	ctx context.Context,
	build func(*multipart.Writer) error,
) (Report, error) {
	var body bytes.Buffer

	writer := multipart.NewWriter(&body)
	if err := build(writer); err != nil {
		return Report{}, err
	}

	if err := writer.Close(); err != nil {
		return Report{}, fmt.Errorf("snaptojson: close form: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, &body)
	if err != nil {
		return Report{}, fmt.Errorf("snaptojson: request: %w", err)
	}

	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("Accept", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return Report{}, fmt.Errorf("snaptojson: call: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	raw, err := io.ReadAll(io.LimitReader(response.Body, maxArtifactBytes))
	if err != nil {
		return Report{}, fmt.Errorf("snaptojson: read body: %w", err)
	}

	if response.StatusCode == http.StatusOK || response.StatusCode == http.StatusAccepted {
		var report Report
		if err := json.Unmarshal(raw, &report); err != nil {
			return Report{}, fmt.Errorf("snaptojson: decode report: %w", err)
		}

		return report, nil
	}

	return Report{}, decodeError(response.StatusCode, raw)
}

// filePart builds the one form part the vendor expects: a file named "file".
func filePart(filename, contentType string) textproto.MIMEHeader {
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename=%q`, filename))
	header.Set("Content-Type", contentType)

	return header
}

// decodeError reads ErrorEnvelope. An unparseable error body still has to become a
// useful error, so the status is the fallback.
func decodeError(status int, raw []byte) error {
	if len(raw) > maxErrorBody {
		raw = raw[:maxErrorBody]
	}

	var envelope struct {
		Error APIError `json:"error"`
	}

	if err := json.Unmarshal(raw, &envelope); err != nil || envelope.Error.Code == "" {
		return &APIError{
			Status: status, Code: "unexpected_response",
			Message: strings.TrimSpace(string(raw)),
		}
	}

	envelope.Error.Status = status

	return &envelope.Error
}
