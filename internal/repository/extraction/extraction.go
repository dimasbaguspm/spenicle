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

var ErrNoPolling = errors.New("extraction rail does not support polling")

const (
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

type Artifact struct {
	Filename    string
	ContentType string
	Bytes       []byte
}

type Violation struct {
	Pointer string `json:"pointer"`
	Error   string `json:"error"`
}

type Report struct {
	Rail       string
	Model      string
	Status     string
	JobRef     string
	Data       json.RawMessage
	Valid      bool
	Violations []Violation
	Error      string
}

type Extractor interface {
	Rail() string
	Model() string
	Submit(ctx context.Context, artifact Artifact) (Report, error)
	Poll(ctx context.Context, jobRef string) (Report, error)
}
