// Package extraction is the one contract every extraction rail speaks. SnapToJSON,
// OpenAI, a local model or a stub all answer with the same Report, so nothing
// upstream — the capture module, the API, the database — has to know which vendor
// produced a draft.
//
// A rail is a driven adapter: it owns the vendor's wire format and returns this
// package's vocabulary. Adding a rail means one new implementation, one line in the
// composition root, and no change here.
package extraction

import (
	"context"
	"encoding/json"
	"errors"
)

// ErrNoPolling reports a rail that answers once and has nothing to read back.
var ErrNoPolling = errors.New("extraction rail does not support polling")

// Unified report statuses. A vendor's own words are mapped onto these three.
const (
	// StatusRunning means the rail accepted the work and has not finished: store the
	// JobRef and poll later.
	StatusRunning = "running"
	// StatusCompleted means a draft is available: Data holds the fields.
	StatusCompleted = "completed"
	// StatusFailed means the rail gave up: Error says why.
	StatusFailed = "failed"
)

// Artifact is one document on its way to a rail.
type Artifact struct {
	Filename    string
	ContentType string
	Bytes       []byte
}

// Violation is one field the document did not satisfy, named by a JSON pointer.
type Violation struct {
	Pointer string `json:"pointer"`
	Error   string `json:"error"`
}

// Report is the only shape the rest of the system sees. Data is the vendor's fields
// as a JSON object, already parsed; Rail is what produced them.
type Report struct {
	// Rail is the vendor name, recorded on the capture so a draft is never anonymous.
	Rail   string
	Status string
	// JobRef is how to poll a running rail back. Empty for single-shot rails.
	JobRef string
	// Data is the extracted JSON object. Nil when the rail produced nothing.
	Data json.RawMessage
	// Valid reports whether the vendor considers Data complete against its schema.
	Valid      bool
	Violations []Violation
	// Error is the vendor's failure text, only on StatusFailed.
	Error string
}

// Extractor is the contract the capture module depends on.
type Extractor interface {
	// Rail is the stable name stored on every capture this rail produces.
	Rail() string
	// Submit hands over one document. A running answer is a Report, not an error.
	Submit(ctx context.Context, artifact Artifact) (Report, error)
	// Poll reads a running report back by JobRef. Single-shot rails return
	// ErrNoPolling.
	Poll(ctx context.Context, jobRef string) (Report, error)
}
