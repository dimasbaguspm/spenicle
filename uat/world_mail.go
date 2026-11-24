package uat

import (
	"context"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
)

const uatReceivedAtUnix = 1_700_000_000

const uatRawMail = "From: alerts@bank.example\r\n" +
	"To: me@example.com\r\n" +
	"Subject: Card purchase\r\n" +
	"Message-Id: <uat-1@bank.example>\r\n" +
	"Content-Type: text/plain; charset=utf-8\r\n" +
	"\r\n" +
	"You spent 18000 at KOPI KENANGAN\r\n"

// fakeMailbox is the mailbox the suite polls: one deterministic message, so a scenario
// proves the intake path without a mail account.
type fakeMailbox struct{}

func (fakeMailbox) Source() string { return constant.MailSourceGmail }

func (fakeMailbox) Fetch(_ context.Context, _ time.Time, _ int) ([]intake.Mail, error) {
	return []intake.Mail{uatMail()}, nil
}

func (fakeMailbox) Refresh(_ context.Context, _ string) (intake.Mail, error) {
	return uatMail(), nil
}

func uatMail() intake.Mail {
	return intake.Mail{
		Ref:        "gmail-uat-1",
		MessageID:  "<uat-1@bank.example>",
		From:       "alerts@bank.example",
		Subject:    "Card purchase",
		Revision:   "1",
		ReceivedAt: time.Unix(uatReceivedAtUnix, 0).UTC(),
		Raw:        []byte(uatRawMail),
	}
}
