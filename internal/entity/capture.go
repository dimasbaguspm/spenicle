package entity

import (
	"errors"
	"fmt"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
)

var (
	ErrCaptureResolved    = errors.New("capture is already resolved")
	ErrUnknownCaptureKind = errors.New("unknown capture kind")
)

var captureTransitions = map[string]map[string]bool{
	constant.CaptureStatusExtracting: {
		constant.CaptureStatusPending: true,
		constant.CaptureStatusFailed:  true,
	},
	constant.CaptureStatusFailed: {
		constant.CaptureStatusPending:    true,
		constant.CaptureStatusExtracting: true,
		constant.CaptureStatusRejected:   true,
	},
	constant.CaptureStatusPending: {
		constant.CaptureStatusApproved:  true,
		constant.CaptureStatusRejected:  true,
		constant.CaptureStatusDuplicate: true,
	},
	constant.CaptureStatusDuplicate: {constant.CaptureStatusPending: true},
	constant.CaptureStatusApproved:  {},
	constant.CaptureStatusRejected:  {constant.CaptureStatusPending: true},
}

type Capture struct {
	ID               int64
	Ref              string
	Kind             string
	Status           string
	ClientID         string
	DedupeKey        string
	BatchID          string
	ArtifactHash     string
	RawText          string
	DraftJSON        string
	ExtractionError  string
	JobRef           string
	ExtractionRail   string
	ExtractionModel  string
	ResolvedEntryRef string
	ResolutionNote   string
	ReceivedAt       time.Time
	ResolvedAt       *time.Time
}

// RecurringDraft is what a due recurring rule leaves in the queue: the fields the
// review screen prefills, so a rule never posts a ledger entry on its own.
type RecurringDraft struct {
	RuleRef     string `json:"recurring_rule_ref"`
	PayeeRef    string `json:"payee_ref,omitempty"`
	AccountRef  string `json:"account_ref"`
	CategoryRef string `json:"category_ref,omitempty"`
	AmountMinor string `json:"amount_minor"`
	Currency    string `json:"currency"`
	DueOn       string `json:"due_on"`
}

func (c Capture) Transition(to string) error {
	allowed, known := captureTransitions[c.Status]
	if !known {
		return fmt.Errorf("%w: unknown status %q", ErrInvalidState, c.Status)
	}

	if !allowed[to] {
		return fmt.Errorf("%w: %s to %s", ErrInvalidState, c.Status, to)
	}

	return nil
}

func (c Capture) IsResolved() bool {
	return c.Status == constant.CaptureStatusApproved ||
		c.Status == constant.CaptureStatusRejected ||
		c.Status == constant.CaptureStatusDuplicate
}
