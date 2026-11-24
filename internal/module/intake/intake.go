// Package intake turns a mail into a capture. It never posts the ledger: a poll produces
// a captures row, and only an approval does. The mailbox is a driven adapter, so a new
// provider is one implementation plus one line in the composition root.
package intake

import (
	"context"
	"errors"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
)

var (
	ErrNotConfigured = errors.New("intake is not configured")
	ErrGone          = errors.New("the provider no longer has that message")
)

// Mail is one message as any provider presents it: an opaque handle to fetch it again,
// the headers a human recognises, and the raw MIME bytes for the one shared parser.
type Mail struct {
	Ref        string
	ThreadRef  string
	MessageID  string
	From       string
	Subject    string
	Revision   string
	ReceivedAt time.Time
	Raw        []byte
}

type Mailbox interface {
	Source() string
	Fetch(ctx context.Context, since time.Time, limit int) ([]Mail, error)
	Refresh(ctx context.Context, messageRef string) (Mail, error)
}

type Contract interface {
	Poll(ctx context.Context, now time.Time) (Result, error)
	Refresh(ctx context.Context, ref string, now time.Time) (entity.MailMessage, error)
	MessageByRef(ctx context.Context, ref string) (entity.MailMessage, bool, error)
	Configure(ctx context.Context, in Config) (Config, error)
	Config(ctx context.Context) (Config, error)
}

type Result struct {
	Created   int
	Skipped   int
	Failed    int
	Unchanged int
}

type Config struct {
	Enabled   bool     `json:"enabled"`
	Allowlist []string `json:"allowlist"`
}

type Store interface {
	InsertMailMessage(ctx context.Context, message entity.MailMessage) (entity.MailMessage, error)
	MailMessageByRef(ctx context.Context, ref string) (entity.MailMessage, bool, error)
	MailMessageBySource(
		ctx context.Context,
		source, messageRef string,
	) (entity.MailMessage, bool, error)
	UpdateMailMessage(ctx context.Context, message entity.MailMessage) (entity.MailMessage, error)
}

type Captures interface {
	Create(ctx context.Context, in captures.CreateInput) (entity.Capture, bool, error)
}
