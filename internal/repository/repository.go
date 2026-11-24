// Package repository declares the contracts for everything outside this
// process: the database today, an extraction vendor tomorrow. Modules depend on
// these interfaces, never on a concrete adapter, which is what lets a second
// implementation plug in without touching business logic.
package repository

import (
	"context"
	"io"
	"time"

	"github.com/dimasbaguspm/spenicle/internal/entity"
)

type Ledger interface {
	InsertEntry(ctx context.Context, entry entity.Entry) (entity.Entry, error)
	EntryByClientID(ctx context.Context, clientID string) (entity.Entry, bool, error)
	EntryByRef(ctx context.Context, ref string) (entity.Entry, bool, error)
	ListEntries(ctx context.Context, filter entity.EntryFilter) ([]entity.Entry, error)
	VoidEntry(ctx context.Context, ref, reason string, at time.Time) (entity.Entry, error)
	UpdateEntryPayee(ctx context.Context, ref string, payeeID *int64) (entity.Entry, bool, error)
	MatchingEntryRef(ctx context.Context, probe entity.EntryProbe) (string, bool, error)
	ReplaceEntry(
		ctx context.Context,
		ref string,
		replacement entity.Entry,
		reason string,
		at time.Time,
	) (entity.Entry, error)
}

type Captures interface {
	InsertCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
	CaptureByDedupeKey(ctx context.Context, key string) (entity.Capture, bool, error)
	CaptureByRef(ctx context.Context, ref string) (entity.Capture, bool, error)
	ListCaptures(ctx context.Context, filter entity.CaptureFilter) ([]entity.Capture, error)
	UpdateCapture(ctx context.Context, capture entity.Capture) (entity.Capture, error)
}

type Accounts interface {
	CountAccounts(ctx context.Context) (int, error)
	CreateAccount(ctx context.Context, name, kind, currency string) (entity.Account, error)
	CreateAccountWithParent(
		ctx context.Context, name, kind, currency, parentRef string,
	) (entity.Account, error)
	FindAccount(ctx context.Context, name, kind string) (entity.Account, bool, error)
	AccountByRef(ctx context.Context, ref string) (entity.Account, bool, error)
	UpdateAccount(ctx context.Context, account entity.Account) (entity.Account, error)
	ListAccounts(ctx context.Context, filter entity.AccountFilter) ([]entity.Account, error)
	BalancesByAccount(ctx context.Context) (map[int64]int64, error)
}

type Artifacts interface {
	InsertArtifact(ctx context.Context, artifact entity.Artifact) (entity.Artifact, error)
	ArtifactByCaptureRef(ctx context.Context, captureRef string) (entity.Artifact, bool, error)
	ExpiredArtifacts(ctx context.Context, rejectedBefore time.Time, limit int) ([]entity.Artifact, error)
	MarkArtifactDeleted(ctx context.Context, ref string, at time.Time) (bool, error)
}

type ArtifactFiles interface {
	Open(ctx context.Context, sha string) (io.ReadCloser, error)
}

type System interface {
	SchemaVersion(ctx context.Context) (int, error)
	Ping(ctx context.Context) error
	Setting(ctx context.Context, key string) (string, bool, error)
	SetSetting(ctx context.Context, key, value string) error
	CreateSetting(ctx context.Context, key, value string) (bool, error)
	HasEntries(ctx context.Context) (bool, error)
}

type Audit interface {
	ListAudit(ctx context.Context, filter entity.AuditFilter) ([]entity.Audit, error)
}

type Tokens interface {
	InsertToken(ctx context.Context, token entity.Token) (entity.Token, error)
	TokenByDigest(ctx context.Context, digest string) (entity.Token, bool, error)
	ListTokens(ctx context.Context, filter entity.TokenFilter) ([]entity.Token, error)
	RevokeToken(ctx context.Context, ref string, at time.Time) (entity.Token, bool, error)
	TouchToken(ctx context.Context, ref string, at time.Time) error
}

type Payees interface {
	CreatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error)
	PayeeByRef(ctx context.Context, ref string) (entity.Payee, bool, error)
	ListPayees(ctx context.Context, filter entity.PayeeFilter) ([]entity.Payee, error)
	UpdatePayee(ctx context.Context, payee entity.Payee) (entity.Payee, error)
}

type Connections interface {
	ConnectionByProvider(ctx context.Context, provider string) (entity.Connection, bool, error)
	SaveConnection(ctx context.Context, connection entity.Connection) (entity.Connection, error)
	RevokeConnection(ctx context.Context, ref string, at time.Time) (entity.Connection, bool, error)
}

type MailMessages interface {
	InsertMailMessage(ctx context.Context, message entity.MailMessage) (entity.MailMessage, error)
	MailMessageByRef(ctx context.Context, ref string) (entity.MailMessage, bool, error)
	MailMessageBySource(
		ctx context.Context,
		source, messageRef string,
	) (entity.MailMessage, bool, error)
	UpdateMailMessage(ctx context.Context, message entity.MailMessage) (entity.MailMessage, error)
	ListMailMessages(ctx context.Context, filter entity.MailMessageFilter) ([]entity.MailMessage, error)
}

type Analytics interface {
	MonthlyTotals(ctx context.Context, from, to time.Time) ([]entity.MonthTotal, error)
	CategoryTotals(ctx context.Context, from, to time.Time, kind string) ([]entity.CategoryTotal, error)
	CategoryTotalsByRoot(ctx context.Context, from, to time.Time, kind string) ([]entity.CategoryTotal, error)
	CategoryTotalsByMonth(
		ctx context.Context,
		from, to time.Time,
		kind string,
	) ([]entity.CategoryMonthlyTotal, error)
	CaptureCount(ctx context.Context, status string) (int, error)
}

type CustomQueries interface {
	CreateCustomQuery(ctx context.Context, query entity.CustomQuery) (entity.CustomQuery, error)
	CustomQueryByRef(ctx context.Context, ref string) (entity.CustomQuery, bool, error)
	UpdateCustomQuery(ctx context.Context, query entity.CustomQuery) (entity.CustomQuery, error)
	ListCustomQueries(ctx context.Context) ([]entity.CustomQuery, error)
}

type Recurring interface {
	CreateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error)
	RecurringByRef(ctx context.Context, ref string) (entity.Recurring, bool, error)
	ListRecurring(ctx context.Context, filter entity.RecurringFilter) ([]entity.Recurring, error)
	DueRecurring(ctx context.Context, asOf time.Time, limit int) ([]entity.Recurring, error)
	UpdateRecurring(ctx context.Context, rule entity.Recurring) (entity.Recurring, error)
	AdvanceRecurring(
		ctx context.Context,
		ref string,
		from, to, postedAt time.Time,
	) (bool, error)
}

//nolint:interfacebloat // one SQLite adapter owns the import tables; splitting it renames the same dep
type Imports interface {
	InsertImportBatch(ctx context.Context, batch entity.ImportBatch) (entity.ImportBatch, error)
	ImportBatchByRef(ctx context.Context, ref string) (entity.ImportBatch, bool, error)
	ImportBatchByClientID(ctx context.Context, clientID string) (entity.ImportBatch, bool, error)
	ListImportBatches(ctx context.Context, filter entity.ImportFilter) ([]entity.ImportBatch, error)
	CloseImportBatch(ctx context.Context, ref, status string, at time.Time) (entity.ImportBatch, error)
	ExtendImportBatch(ctx context.Context, ref string, expiresAt time.Time) error
	ImportRows(ctx context.Context, batchID int64) ([]entity.ImportRow, error)
	UpdateImportRow(ctx context.Context, row entity.ImportRow) (entity.ImportRow, error)
	ExpiredImportBatches(ctx context.Context, now time.Time, limit int) ([]entity.ImportBatch, error)
	DropImportBatch(ctx context.Context, ref string, event entity.ImportEvent) (int, error)
	BeginImportCommit(ctx context.Context, ref string) (bool, error)
	InsertImportUpload(ctx context.Context, upload entity.ImportUpload) (entity.ImportUpload, error)
	ImportUploadByClientID(ctx context.Context, clientID string) (entity.ImportUpload, bool, error)
	ImportUploadByRef(ctx context.Context, ref string) (entity.ImportUpload, bool, error)
	AppendImportChunk(ctx context.Context, ref string, index int, bytes int64, at time.Time) (bool, error)
	CompleteImportUpload(ctx context.Context, ref, fileHash string, at time.Time) (bool, error)
	ExpiredImportUploads(ctx context.Context, before time.Time, limit int) ([]entity.ImportUpload, error)
	DropImportUpload(ctx context.Context, ref string) (int, error)
}

type ImportEvents interface {
	InsertImportEvent(ctx context.Context, event entity.ImportEvent) (entity.ImportEvent, error)
	ListImportEvents(ctx context.Context, filter entity.ImportEventFilter) ([]entity.ImportEvent, error)
}

// Exporter reads whole tables for the export document: no filter, no cursor and
// no limit. Paging a table that is ordered by something other than id drops the
// rows behind the cursor, and a single user's ledger fits in memory anyway.
type Exporter interface {
	AllAccounts(ctx context.Context) ([]entity.Account, error)
	AllPayees(ctx context.Context) ([]entity.Payee, error)
	AllCaptures(ctx context.Context) ([]entity.Capture, error)
	AllRecurring(ctx context.Context) ([]entity.Recurring, error)
}

type RateSource interface {
	Daily(ctx context.Context) ([]entity.Rate, error)
}

type RateStore interface {
	SaveRates(ctx context.Context, rates []entity.Rate) error
	RateOn(ctx context.Context, base, quote string, on time.Time) (entity.Rate, bool, error)
	ListRates(ctx context.Context) ([]entity.Rate, error)
}

type Exports interface {
	InsertExport(ctx context.Context, job entity.Export) (entity.Export, error)
	ExportByRef(ctx context.Context, ref string) (entity.Export, bool, error)
	ExportByClientID(ctx context.Context, clientID string) (entity.Export, bool, error)
	ListExports(ctx context.Context, filter entity.ExportFilter) ([]entity.Export, error)
	FinishExport(ctx context.Context, job entity.Export) (entity.Export, error)
	FailExport(ctx context.Context, ref, message string, at time.Time) (entity.Export, error)
	ExpireExport(ctx context.Context, ref string, at time.Time) (bool, error)
}

type ExportQueue interface {
	QueuedExports(ctx context.Context, limit int) ([]entity.Export, error)
	ClaimExport(ctx context.Context, ref string, at time.Time) (bool, error)
	RequeueExport(ctx context.Context, ref string) (bool, error)
	StaleExports(ctx context.Context, startedBefore time.Time, limit int) ([]entity.Export, error)
	ExpiredExports(ctx context.Context, now time.Time, limit int) ([]entity.Export, error)
}

type ExportEvents interface {
	InsertExportEvent(ctx context.Context, event entity.ExportEvent) (entity.ExportEvent, error)
	ListExportEvents(ctx context.Context, filter entity.ExportEventFilter) ([]entity.ExportEvent, error)
}

type Categorization interface {
	CreateRule(ctx context.Context, rule entity.CategorizationRule) (entity.CategorizationRule, error)
	RuleByRef(ctx context.Context, ref string) (entity.CategorizationRule, bool, error)
	ListRules(ctx context.Context, filter entity.CategorizationFilter) ([]entity.CategorizationRule, error)
	UpdateRule(ctx context.Context, rule entity.CategorizationRule) (entity.CategorizationRule, error)
	ListLiveRules(ctx context.Context) ([]entity.CategorizationRule, error)
}
