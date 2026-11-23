// Package snaptojson is the adapter for the third-party extraction vendor. The
// vendor owns its schema; this package only knows how to hand it bytes and hand
// back the envelope the capture queue stores.
//
// It is deliberately inert until an API key is configured: with no key, captures
// stay raw and the user types the fields, which is the honest default for a
// self-hosted box.
package snaptojson

import (
	"context"
	"errors"
	"fmt"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
)

// spanPrefix names every extraction call Repository.Snaptojson.<method>.
const spanPrefix = "Repository.Snaptojson."

// startSpan is the single place this package spells its span names.
func startSpan(ctx context.Context, method string) (context.Context, func()) {
	return telemetry.StartSpan(ctx, spanPrefix+method)
}

// ErrNotConfigured reports that no API key was supplied.
var ErrNotConfigured = errors.New("extraction provider is not configured")

// Extractor is the contract the capture module depends on. A local model, a
// different vendor, or a stub in tests all satisfy it.
type Extractor interface {
	Extract(ctx context.Context, artifact []byte, contentType string) (string, error)
}

// Client is the HTTP adapter. Zero value is unusable; construct with New.
type Client struct {
	endpoint string
	apiKey   string
}

// New returns an extractor, or ErrNotConfigured when the key is empty.
func New(endpoint, apiKey string) (Extractor, error) {
	if apiKey == "" {
		return nil, ErrNotConfigured
	}

	if endpoint == "" {
		return nil, errors.New("extraction endpoint is required")
	}

	return &Client{endpoint: endpoint, apiKey: apiKey}, nil
}

// Extract posts the artifact and returns the provider's JSON verbatim. Mapping
// that JSON into capture fields is the capture module's job, not the adapter's.
func (c *Client) Extract(ctx context.Context, artifact []byte, contentType string) (string, error) {
	ctx, endSpan := startSpan(ctx, "Extract")
	defer endSpan()

	if c == nil || c.apiKey == "" {
		return "", ErrNotConfigured
	}

	// The wire format is agreed with the vendor in their dashboard; the request
	// builder lands with the extraction milestone.
	_ = ctx
	_ = artifact
	_ = contentType

	return "", fmt.Errorf("%w: request builder not implemented yet", ErrNotConfigured)
}
