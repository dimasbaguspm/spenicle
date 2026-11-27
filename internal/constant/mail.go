package constant

const (
	MailSourceIMAP  = "imap"
	MailSourceGmail = "gmail"

	MailStatusCaptured = "captured"
	MailStatusSkipped  = "skipped"
	MailStatusFailed   = "failed"
	MailStatusGone     = "gone"

	MailSkipSenderNotAllowed = "sender_not_allowed"
	MailSkipNoBody           = "no_body"
	MailSkipDuplicate        = "duplicate"

	MailErrorParse = "parse_failed"
)
