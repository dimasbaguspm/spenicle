// Package snaptojson is the SnapToJSON rail. Contract source:
// https://snaptojson.com/docs/api — one partner route, one verb:
//
//	POST {endpoint}                       submit a file, or read a snap back
//	Authorization: Bearer <project key>   the only credential
//	multipart/form-data                   file=<bytes> or snap_id=<job_ref>
//
// Answers 200 (terminal SnapReport), 202 (still running, post the id back) or an
// ErrorEnvelope. This package owns that wire format and returns the unified
// extraction.Report, so nothing upstream knows the vendor's words.
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
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

// RailName is the stable name recorded on every capture this rail produces.
const RailName = "snaptojson"

// ErrNotConfigured reports that no API key was supplied.
var ErrNotConfigured = errors.New("snaptojson rail is not configured")

const (
	// maxArtifactBytes is the vendor's hard limit: 10 MiB, refused before reading.
	maxArtifactBytes = 10 << 20
	// maxErrorBody bounds what an error response can make us allocate.
	maxErrorBody = 64 << 10
)

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

// New returns the rail, or ErrNotConfigured when the key is empty.
func New(endpoint, apiKey string, timeout time.Duration) (*Client, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, ErrNotConfigured
	}

	if strings.TrimSpace(endpoint) == "" {
		return nil, errors.New("snaptojson endpoint is required")
	}

	return &Client{
		endpoint: endpoint,
		apiKey:   apiKey,
		http:     &http.Client{Timeout: timeout},
	}, nil
}

// Rail is the unified name of this adapter.
func (c *Client) Rail() string { return RailName }

// Submit posts one file. A 202 is a running report, not an error: the caller stores
// JobRef and polls it later.
func (c *Client) Submit(
	ctx context.Context,
	artifact extraction.Artifact,
) (extraction.Report, error) {
	// Posting and Polling are separate spans on purpose: an expensive, billed submit
	// and a free read-back are different events, and a trace should say which one it
	// was without reading the arguments.
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Snaptojson.Posting")
	defer endSpan()

	if len(artifact.Bytes) == 0 {
		return extraction.Report{}, errors.New("snaptojson: empty artifact")
	}

	if len(artifact.Bytes) > maxArtifactBytes {
		return extraction.Report{}, &APIError{
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

	report, err := c.post(ctx, func(writer *multipart.Writer) error {
		part, partErr := writer.CreatePart(filePart(filename, contentType))
		if partErr != nil {
			return fmt.Errorf("snaptojson: form part: %w", partErr)
		}

		if _, partErr = part.Write(artifact.Bytes); partErr != nil {
			return fmt.Errorf("snaptojson: write part: %w", partErr)
		}

		return nil
	})
	if err != nil {
		return extraction.Report{}, err
	}

	return unify(report), nil
}

// Poll reads a snap back by id. This is how a 202 is followed up and how a retry
// works: the vendor is charged once, the read-back is free.
func (c *Client) Poll(ctx context.Context, jobRef string) (extraction.Report, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Snaptojson.Polling")
	defer endSpan()

	if strings.TrimSpace(jobRef) == "" {
		return extraction.Report{}, errors.New("snaptojson: job_ref is required")
	}

	report, err := c.post(ctx, func(writer *multipart.Writer) error {
		return writer.WriteField("snap_id", jobRef)
	})
	if err != nil {
		return extraction.Report{}, err
	}

	return unify(report), nil
}

// snapReport is SnapReport: the body of a submit and of every read-back.
type snapReport struct {
	JobRef string      `json:"job_ref"`
	Status string      `json:"status"`
	Result *snapResult `json:"result"`
	Error  string      `json:"error_message"`
}

// snapResult is SnapResult: what the reader answered.
type snapResult struct {
	Data       json.RawMessage `json:"data"`
	Valid      bool            `json:"valid"`
	Violations []struct {
		Pointer string `json:"pointer"`
		Error   string `json:"error"`
	} `json:"violations"`
}

// unify maps the vendor's four states and its result shape onto extraction.Report.
func unify(report snapReport) extraction.Report {
	unified := extraction.Report{
		Rail:   RailName,
		JobRef: report.JobRef,
		Error:  report.Error,
	}

	switch report.Status {
	case "COMPLETED":
		unified.Status = extraction.StatusCompleted
	case "FAILED":
		unified.Status = extraction.StatusFailed
	default:
		// REGISTERED and EXECUTING are both "still working".
		unified.Status = extraction.StatusRunning
	}

	if report.Result != nil {
		unified.Data = report.Result.Data
		unified.Valid = report.Result.Valid

		for _, violation := range report.Result.Violations {
			unified.Violations = append(unified.Violations, extraction.Violation{
				Pointer: violation.Pointer,
				Error:   violation.Error,
			})
		}
	}

	return unified
}

// filePart builds the one form part the vendor expects: a file named "file".
func filePart(filename, contentType string) textproto.MIMEHeader {
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename=%q`, filename))
	header.Set("Content-Type", contentType)

	return header
}

// post sends one multipart request and decodes either a report or an error
// envelope. One request shape for both halves of the contract is what keeps this
// adapter honest to the vendor's "one route, one verb".
func (c *Client) post(
	ctx context.Context,
	build func(*multipart.Writer) error,
) (snapReport, error) {
	var body bytes.Buffer

	writer := multipart.NewWriter(&body)
	if err := build(writer); err != nil {
		return snapReport{}, err
	}

	if err := writer.Close(); err != nil {
		return snapReport{}, fmt.Errorf("snaptojson: close form: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, &body)
	if err != nil {
		return snapReport{}, fmt.Errorf("snaptojson: request: %w", err)
	}

	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	request.Header.Set("Accept", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return snapReport{}, fmt.Errorf("snaptojson: call: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	raw, err := io.ReadAll(io.LimitReader(response.Body, maxArtifactBytes))
	if err != nil {
		return snapReport{}, fmt.Errorf("snaptojson: read body: %w", err)
	}

	if response.StatusCode == http.StatusOK || response.StatusCode == http.StatusAccepted {
		var report snapReport
		if err := json.Unmarshal(raw, &report); err != nil {
			return snapReport{}, fmt.Errorf("snaptojson: decode report: %w", err)
		}

		return report, nil
	}

	return snapReport{}, decodeError(response.StatusCode, raw)
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
