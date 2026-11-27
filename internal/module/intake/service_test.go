package intake_test

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/common/seal"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/entity"
	"github.com/dimasbaguspm/spenicle/internal/module/captures"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
)

const rawMail = "From: alerts@bank.example\r\n" +
	"To: me@example.com\r\n" +
	"Subject: Card purchase\r\n" +
	"Message-Id: <abc@bank.example>\r\n" +
	"Content-Type: text/plain; charset=utf-8\r\n" +
	"\r\n" +
	"You spent 18000 at KOPI KENANGAN\r\n"

type fakeMailbox struct {
	mails     []intake.Mail
	refreshed intake.Mail
	err       error
}

func (m *fakeMailbox) Source() string { return constant.MailSourceGmail }

func (m *fakeMailbox) Fetch(_ context.Context, _ time.Time, _ int) ([]intake.Mail, error) {
	return m.mails, m.err
}

func (m *fakeMailbox) Refresh(_ context.Context, _ string) (intake.Mail, error) {
	return m.refreshed, m.err
}

type fakeStore struct {
	bySource map[string]entity.MailMessage
	updated  []entity.MailMessage
	inserted []entity.MailMessage
}

func newStore() *fakeStore {
	return &fakeStore{bySource: map[string]entity.MailMessage{}}
}

func (s *fakeStore) InsertMailMessage(
	_ context.Context,
	message entity.MailMessage,
) (entity.MailMessage, error) {
	message.Ref = "ref-" + message.MessageRef
	s.bySource[message.MessageRef] = message
	s.inserted = append(s.inserted, message)

	return message, nil
}

func (s *fakeStore) MailMessageByRef(
	_ context.Context,
	ref string,
) (entity.MailMessage, bool, error) {
	for _, message := range s.bySource {
		if message.Ref == ref {
			return message, true, nil
		}
	}

	return entity.MailMessage{}, false, nil
}

func (s *fakeStore) MailMessageBySource(
	_ context.Context,
	_ string,
	messageRef string,
) (entity.MailMessage, bool, error) {
	message, found := s.bySource[messageRef]

	return message, found, nil
}

func (s *fakeStore) UpdateMailMessage(
	_ context.Context,
	message entity.MailMessage,
) (entity.MailMessage, error) {
	s.bySource[message.MessageRef] = message
	s.updated = append(s.updated, message)

	return message, nil
}

func (s *fakeStore) ListMailMessages(
	_ context.Context,
	_ entity.MailMessageFilter,
) ([]entity.MailMessage, error) {
	out := make([]entity.MailMessage, 0, len(s.bySource))

	for _, message := range s.bySource {
		out = append(out, message)
	}

	return out, nil
}

type fakeCaptures struct{ created int }

func (c *fakeCaptures) Create(
	_ context.Context,
	_ captures.CreateInput,
) (entity.Capture, bool, error) {
	c.created++

	return entity.Capture{ID: int64(c.created), Ref: "capture-" + strconv.Itoa(c.created)}, true, nil
}

type fakeSettings struct{ values map[string]string }

func (s *fakeSettings) Setting(_ context.Context, key string) (string, bool, error) {
	value, found := s.values[key]

	return value, found, nil
}

func (s *fakeSettings) SetSetting(_ context.Context, key, value string) error {
	s.values[key] = value

	return nil
}

func newService(
	t *testing.T,
	mailbox *fakeMailbox,
	store *fakeStore,
	captured *fakeCaptures,
) (*intake.Service, *fakeSettings) {
	t.Helper()

	sealer, err := seal.New("0123456789abcdef0123456789abcdef")
	if err != nil {
		t.Fatalf("sealer: %v", err)
	}

	settings := &fakeSettings{values: map[string]string{}}

	return intake.New(store, captured, settings, sealer, mailbox), settings
}

func sampleMail(from string) intake.Mail {
	return intake.Mail{
		Ref:        "gmail-1",
		ThreadRef:  "thread-1",
		MessageID:  "<abc@bank.example>",
		From:       from,
		Subject:    "Card purchase",
		Revision:   "100",
		ReceivedAt: time.Unix(1_700_000_000, 0).UTC(),
		Raw:        []byte(rawMail),
	}
}

func TestPollCapturesAnAllowedMail(t *testing.T) {
	t.Parallel()

	mailbox := &fakeMailbox{mails: []intake.Mail{sampleMail("alerts@bank.example")}}
	store := newStore()
	captured := &fakeCaptures{}

	service, settings := newService(t, mailbox, store, captured)

	if _, err := service.Configure(context.Background(), intake.Config{
		Enabled: true, Allowlist: []string{"bank.example"},
	}); err != nil {
		t.Fatalf("configure: %v", err)
	}

	if settings.values["intake"] == "" {
		t.Fatal("the config was not stored sealed")
	}

	result, err := service.Poll(context.Background(), time.Unix(1_700_000_100, 0).UTC())
	if err != nil {
		t.Fatalf("poll: %v", err)
	}

	if result.Created != 1 || captured.created != 1 {
		t.Fatalf("result = %+v, captured = %d, want one capture", result, captured.created)
	}

	saved := store.inserted[0]
	if saved.Status != constant.MailStatusCaptured || saved.CaptureRef == "" {
		t.Fatalf("row = %+v, want a captured row linked to the capture", saved)
	}

	if saved.MessageIDHeader != "<abc@bank.example>" {
		t.Fatalf("message id = %q, want the header", saved.MessageIDHeader)
	}
}

func TestPollSkipsASenderOutsideTheAllowlist(t *testing.T) {
	t.Parallel()

	mailbox := &fakeMailbox{mails: []intake.Mail{sampleMail("news@example.com")}}
	store := newStore()
	captured := &fakeCaptures{}

	service, _ := newService(t, mailbox, store, captured)

	if _, err := service.Configure(context.Background(), intake.Config{
		Enabled: true, Allowlist: []string{"bank.example"},
	}); err != nil {
		t.Fatalf("configure: %v", err)
	}

	result, err := service.Poll(context.Background(), time.Unix(1_700_000_100, 0).UTC())
	if err != nil {
		t.Fatalf("poll: %v", err)
	}

	if result.Skipped != 1 || captured.created != 0 {
		t.Fatalf("result = %+v, want one skip and no capture", result)
	}

	if store.inserted[0].SkipReason != constant.MailSkipSenderNotAllowed {
		t.Fatalf("skip reason = %q, want the allowlist code", store.inserted[0].SkipReason)
	}
}

func TestPollRefusesWhenIntakeIsOff(t *testing.T) {
	t.Parallel()

	service, _ := newService(t, &fakeMailbox{}, newStore(), &fakeCaptures{})

	if _, err := service.Poll(context.Background(), time.Unix(1_700_000_100, 0).UTC()); !errors.Is(
		err, intake.ErrNotConfigured,
	) {
		t.Fatalf("err = %v, want ErrNotConfigured", err)
	}
}

func TestPollIsIdempotentForAKnownMessage(t *testing.T) {
	t.Parallel()

	mailbox := &fakeMailbox{mails: []intake.Mail{sampleMail("alerts@bank.example")}}
	store := newStore()
	captured := &fakeCaptures{}

	service, _ := newService(t, mailbox, store, captured)

	if _, err := service.Configure(context.Background(), intake.Config{Enabled: true}); err != nil {
		t.Fatalf("configure: %v", err)
	}

	now := time.Unix(1_700_000_100, 0).UTC()

	if _, err := service.Poll(context.Background(), now); err != nil {
		t.Fatalf("first poll: %v", err)
	}

	result, err := service.Poll(context.Background(), now.Add(time.Minute))
	if err != nil {
		t.Fatalf("second poll: %v", err)
	}

	if result.Unchanged != 1 || captured.created != 1 {
		t.Fatalf("result = %+v, want one unchanged and a single capture", result)
	}
}

func TestRefreshSupersedesOnANewerRevision(t *testing.T) {
	t.Parallel()

	store := newStore()
	captured := &fakeCaptures{}
	mailbox := &fakeMailbox{mails: []intake.Mail{sampleMail("alerts@bank.example")}}

	service, _ := newService(t, mailbox, store, captured)

	if _, err := service.Configure(context.Background(), intake.Config{Enabled: true}); err != nil {
		t.Fatalf("configure: %v", err)
	}

	now := time.Unix(1_700_000_100, 0).UTC()

	if _, err := service.Poll(context.Background(), now); err != nil {
		t.Fatalf("poll: %v", err)
	}

	known, found, err := service.MessageByRef(context.Background(), "ref-gmail-1")
	if err != nil || !found {
		t.Fatalf("known message: found = %v, err = %v", found, err)
	}

	mailbox.refreshed = sampleMail("alerts@bank.example")
	mailbox.refreshed.Ref = "gmail-1"
	mailbox.refreshed.Revision = "200"

	fresh, err := service.Refresh(context.Background(), known.Ref, now.Add(time.Hour))
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}

	if !strings.HasPrefix(fresh.Ref, "ref-") {
		t.Fatalf("fresh = %+v, want a new row", fresh)
	}

	updated := store.bySource["gmail-1"]
	if updated.SupersededBy != fresh.Ref {
		t.Fatalf("superseded_by = %q, want %q", updated.SupersededBy, fresh.Ref)
	}

	if captured.created != 2 {
		t.Fatalf("captures = %d, want a second capture for the new revision", captured.created)
	}
}

func TestRefreshMarksAGoneMessage(t *testing.T) {
	t.Parallel()

	store := newStore()
	mailbox := &fakeMailbox{mails: []intake.Mail{sampleMail("a@b.c")}}

	service, _ := newService(t, mailbox, store, &fakeCaptures{})

	if _, err := service.Configure(context.Background(), intake.Config{Enabled: true}); err != nil {
		t.Fatalf("configure: %v", err)
	}

	now := time.Unix(1_700_000_100, 0).UTC()
	if _, err := service.Poll(context.Background(), now); err != nil {
		t.Fatalf("poll: %v", err)
	}

	mailbox.err = intake.ErrGone

	message, err := service.Refresh(context.Background(), "ref-gmail-1", now)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}

	if message.Status != constant.MailStatusGone {
		t.Fatalf("status = %q, want gone", message.Status)
	}
}
