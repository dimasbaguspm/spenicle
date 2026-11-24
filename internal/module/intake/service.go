package intake

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
)

const (
	settingKey  = "intake"
	window      = 72 * time.Hour
	burst       = 50
	maxBodySize = 64 << 10
	captureKind = "email"
)

type Service struct {
	store    Store
	queue    Captures
	settings SettingStore
	sealer   seal.Sealer
	mailbox  Mailbox
}

type SettingStore interface {
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
}

func New(
	store Store,
	queue Captures,
	settings SettingStore,
	sealer seal.Sealer,
	mailbox Mailbox,
) *Service {
	return &Service{
		store: store, queue: queue, settings: settings, sealer: sealer, mailbox: mailbox,
	}
}

var _ Contract = (*Service)(nil)

func (s *Service) Config(ctx context.Context) (Config, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Intake.Config")
	defer endSpan()

	sealed, found, err := s.settings.Setting(ctx, settingKey)
	if err != nil {
		return Config{}, err
	}

	if !found {
		return Config{}, nil
	}

	plain, err := s.sealer.Open(ctx, sealed)
	if err != nil {
		return Config{}, fmt.Errorf("open intake config: %w", err)
	}

	var config Config
	if err := json.Unmarshal(plain, &config); err != nil {
		return Config{}, fmt.Errorf("decode intake config: %w", err)
	}

	return config, nil
}

func (s *Service) Configure(ctx context.Context, in Config) (Config, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Intake.Configure")
	defer endSpan()

	allowlist := make([]string, 0, len(in.Allowlist))

	for _, sender := range in.Allowlist {
		if trimmed := strings.ToLower(strings.TrimSpace(sender)); trimmed != "" {
			allowlist = append(allowlist, trimmed)
		}
	}

	config := Config{Enabled: in.Enabled, Allowlist: allowlist}

	plain, err := json.Marshal(config)
	if err != nil {
		return Config{}, fmt.Errorf("encode intake config: %w", err)
	}

	sealed, err := s.sealer.Seal(ctx, plain)
	if err != nil {
		return Config{}, fmt.Errorf("seal intake config: %w", err)
	}

	if err := s.settings.SetSetting(ctx, settingKey, sealed); err != nil {
		return Config{}, fmt.Errorf("store intake config: %w", err)
	}

	return config, nil
}

func (s *Service) Poll(ctx context.Context, now time.Time) (Result, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Intake.Poll")
	defer endSpan()

	config, err := s.Config(ctx)
	if err != nil {
		return Result{}, err
	}

	if !config.Enabled {
		return Result{}, ErrNotConfigured
	}

	mails, err := s.mailbox.Fetch(ctx, now.Add(-window), burst)
	if err != nil {
		return Result{}, err
	}

	var result Result

	for _, message := range mails {
		outcome := s.ingest(ctx, message, now)

		switch outcome {
		case constant.MailStatusCaptured:
			result.Created++
		case constant.MailStatusSkipped:
			result.Skipped++
		case constant.MailStatusFailed:
			result.Failed++
		case "unchanged":
			result.Unchanged++
		}
	}

	return result, nil
}

func (s *Service) Refresh(
	ctx context.Context,
	ref string,
	now time.Time,
) (entity.MailMessage, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Intake.Refresh")
	defer endSpan()

	known, found, err := s.store.MailMessageByRef(ctx, ref)
	if err != nil {
		return entity.MailMessage{}, err
	}

	if !found {
		return entity.MailMessage{}, fmt.Errorf("%w: mail message %s", entity.ErrNotFound, ref)
	}

	message, err := s.mailbox.Refresh(ctx, known.MessageRef)
	if errors.Is(err, ErrGone) {
		known.Status = constant.MailStatusGone
		known.LastSyncedAt = now

		return s.store.UpdateMailMessage(ctx, known)
	}

	if err != nil {
		known.Attempts++
		known.LastError = err.Error()
		known.LastSyncedAt = now

		if _, updateErr := s.store.UpdateMailMessage(ctx, known); updateErr != nil {
			return entity.MailMessage{}, updateErr
		}

		return entity.MailMessage{}, err
	}

	if message.Revision == known.ProviderRevision {
		known.LastSyncedAt = now

		return s.store.UpdateMailMessage(ctx, known)
	}

	// A newer revision is a new capture: nothing here mutates an old one, and the old
	// row points forward instead of disappearing.
	fresh := s.capture(ctx, message, now)

	known.SupersededBy = fresh.Ref
	known.LastSyncedAt = now

	if _, err := s.store.UpdateMailMessage(ctx, known); err != nil {
		return entity.MailMessage{}, err
	}

	return fresh, nil
}

func (s *Service) MessageByRef(
	ctx context.Context,
	ref string,
) (entity.MailMessage, bool, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Module.Intake.MessageByRef")
	defer endSpan()

	return s.store.MailMessageByRef(ctx, ref)
}

func (s *Service) ingest(ctx context.Context, message Mail, now time.Time) string {
	known, found, err := s.store.MailMessageBySource(ctx, s.mailbox.Source(), message.Ref)
	if err != nil {
		return constant.MailStatusFailed
	}

	if found {
		known.LastSyncedAt = now
		_, _ = s.store.UpdateMailMessage(ctx, known)

		return "unchanged"
	}

	config, err := s.Config(ctx)
	if err != nil {
		return constant.MailStatusFailed
	}

	if !allowed(message.From, config.Allowlist) {
		s.record(ctx, message, now, constant.MailStatusSkipped, constant.MailSkipSenderNotAllowed,
			nil)

		return constant.MailStatusSkipped
	}

	saved := s.capture(ctx, message, now)
	if saved.Status == constant.MailStatusCaptured {
		return constant.MailStatusCaptured
	}

	return saved.Status
}

func (s *Service) capture(ctx context.Context, message Mail, now time.Time) entity.MailMessage {
	text, err := parseBody(message.Raw)
	if err != nil || text == "" {
		return s.record(ctx, message, now, constant.MailStatusSkipped, constant.MailSkipNoBody, nil)
	}

	created, fresh, err := s.queue.Create(ctx, captures.CreateInput{
		ClientID:   clientID(message),
		Kind:       captureKind,
		RawText:    buildText(message, text),
		ReceivedAt: message.ReceivedAt,
	})
	if err != nil {
		return s.record(ctx, message, now, constant.MailStatusFailed, constant.MailErrorParse, nil)
	}

	if !fresh {
		return s.record(ctx, message, now, constant.MailStatusSkipped, constant.MailSkipDuplicate,
			nil)
	}

	return s.record(ctx, message, now, constant.MailStatusCaptured, "", &created.ID)
}

func (s *Service) record(
	ctx context.Context,
	message Mail,
	now time.Time,
	status, skipReason string,
	captureID *int64,
) entity.MailMessage {
	saved, err := s.store.InsertMailMessage(ctx, entity.MailMessage{
		Source:           s.mailbox.Source(),
		MessageRef:       message.Ref,
		ThreadRef:        message.ThreadRef,
		MessageIDHeader:  message.MessageID,
		ProviderRevision: message.Revision,
		ReceivedAt:       message.ReceivedAt,
		ObservedAt:       now,
		CaptureID:        captureID,
		Status:           status,
		SkipReason:       skipReason,
		LastSyncedAt:     now,
	})
	if err != nil {
		return entity.MailMessage{Status: constant.MailStatusFailed}
	}

	return saved
}

func allowed(from string, allowlist []string) bool {
	if len(allowlist) == 0 {
		return true
	}

	sender := strings.ToLower(from)

	for _, entry := range allowlist {
		if strings.Contains(sender, entry) {
			return true
		}
	}

	return false
}

// clientID is the idempotency key: the Message-ID when the provider gives one, and a
// header digest otherwise, so a re-poll or a re-delivery is a no-op downstream.
func clientID(message Mail) string {
	if message.MessageID != "" {
		return "mail:" + message.MessageID
	}

	return "mail:" + message.Ref
}

func buildText(message Mail, body string) string {
	subject := strings.TrimSpace(message.Subject)
	if subject == "" {
		return body
	}

	return subject + "\n\n" + body
}

// parseBody walks the MIME tree and returns the first text/plain part, capped. A mail
// with no text part is a skip, not a failure: the human still sees it in the mailbox.
func parseBody(raw []byte) (string, error) {
	parsed, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		return "", fmt.Errorf("parse mime: %w", err)
	}

	contentType := parsed.Header.Get("Content-Type")
	mediaType, params, _ := mime.ParseMediaType(contentType)

	if strings.HasPrefix(mediaType, "multipart/") {
		return parseMultipart(parsed.Body, params["boundary"])
	}

	return readCapped(parsed.Body)
}

func parseMultipart(body io.Reader, boundary string) (string, error) {
	if boundary == "" {
		return "", errors.New("multipart without a boundary")
	}

	reader := multipart.NewReader(body, boundary)

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			return "", nil
		}

		if err != nil {
			return "", fmt.Errorf("read mime part: %w", err)
		}

		if strings.HasPrefix(part.Header.Get("Content-Type"), "text/plain") {
			return readCapped(part)
		}
	}
}

func readCapped(reader io.Reader) (string, error) {
	limited, err := io.ReadAll(io.LimitReader(reader, maxBodySize))
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}

	return strings.TrimSpace(string(limited)), nil
}
