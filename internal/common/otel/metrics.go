package telemetry

import (
	"context"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// The attribute vocabulary: every signal speaks these keys and nothing else.
const (
	AttrVersion   = "spenicle.version"
	AttrComponent = "spenicle.component"
	AttrRef       = "spenicle.ref"
	AttrJob       = "spenicle.job"
	AttrRows      = "spenicle.rows"
	AttrOutcome   = "spenicle.outcome"
	AttrOperation = "spenicle.operation"
	AttrSource    = "spenicle.entry.source"
	AttrKind      = "spenicle.capture.kind"
	AttrClashKind = "spenicle.clash.kind"

	AttrMethod = "http.request.method"
	AttrRoute  = "http.route"
	AttrStatus = "http.response.status_code"
)

// Components, jobs and outcomes are closed enums: they are the only bounded
// attribute values the metrics accept.
const (
	ComponentHTTP   = "http"
	ComponentWorker = "worker"
)

const (
	JobRecurring = "recurring"
	JobArtifacts = "artifacts"
	JobImports   = "imports"
	JobExports   = "exports"
	JobSweep     = "sweep"
)

const (
	OutcomeOK      = "ok"
	OutcomeFailed  = "failed"
	OutcomeSkipped = "skipped"
)

const (
	OperationOpen   = "open"
	OperationBegin  = "begin"
	OperationWrite  = "write"
	OperationCommit = "commit"
)

const meterName = "spenicle"

const (
	unitRequest    = "{request}"
	unitRun        = "{run}"
	unitItem       = "{item}"
	unitEntry      = "{entry}"
	unitPosting    = "{posting}"
	unitTransition = "{transition}"
	unitRow        = "{row}"
	unitClash      = "{clash}"
	unitRetry      = "{retry}"
	unitSecond     = "s"
	unitByte       = "By"
)

type instrumentSet struct {
	httpRequests   metric.Int64Counter
	httpDuration   metric.Float64Histogram
	httpInFlight   metric.Int64UpDownCounter
	workerRuns     metric.Int64Counter
	workerItems    metric.Int64Counter
	workerDuration metric.Float64Histogram
	entries        metric.Int64Counter
	postings       metric.Int64Counter
	captures       metric.Int64Counter
	importRows     metric.Int64Counter
	importClashes  metric.Int64Counter
	exportBytes    metric.Int64Histogram
	sqliteLocked   metric.Int64Counter
}

//nolint:gochecknoglobals // one process-wide instrument set, built once after Setup installs the provider
var (
	instrumentsOnce  sync.Once
	instrumentsValue *instrumentSet
)

func instruments() *instrumentSet {
	instrumentsOnce.Do(func() { instrumentsValue = newInstruments() })

	return instrumentsValue
}

func newInstruments() *instrumentSet {
	meter := otel.Meter(meterName)

	return &instrumentSet{
		httpRequests: mustCounter(meter, "spenicle.http.server.requests", unitRequest,
			"HTTP requests served"),
		httpDuration: mustFloatHistogram(meter, "spenicle.http.server.duration", unitSecond,
			"Wall-clock time to answer an HTTP request"),
		httpInFlight: mustUpDownCounter(meter, "spenicle.http.server.in_flight", unitRequest,
			"HTTP requests being served right now"),
		workerRuns: mustCounter(meter, "spenicle.worker.runs", unitRun,
			"Worker steps run, by job and outcome"),
		workerItems: mustCounter(meter, "spenicle.worker.items", unitItem,
			"Items a worker step handled, by job and outcome"),
		workerDuration: mustFloatHistogram(meter, "spenicle.worker.run.duration", unitSecond,
			"Wall-clock time one worker step took"),
		entries: mustCounter(meter, "spenicle.entries", unitEntry,
			"Ledger entries posted, by source"),
		postings: mustCounter(meter, "spenicle.postings", unitPosting,
			"Ledger postings written, by source"),
		captures: mustCounter(meter, "spenicle.captures.transitions", unitTransition,
			"Capture status transitions, by kind and outcome"),
		importRows: mustCounter(meter, "spenicle.imports.rows", unitRow,
			"Statement rows parsed into a draft"),
		importClashes: mustCounter(meter, "spenicle.imports.clashes", unitClash,
			"Statement rows flagged as a clash, by kind"),
		exportBytes: mustIntHistogram(meter, "spenicle.exports.bytes", unitByte,
			"Size of a rendered export document"),
		sqliteLocked: mustCounter(meter, "spenicle.sqlite.locked", unitRetry,
			"SQLite operations that lost the write lock, by operation"),
	}
}

//nolint:ireturn // the SDK hands back the instrument interface
func mustCounter(
	meter metric.Meter,
	name, unit, description string,
) metric.Int64Counter {
	counter, err := meter.Int64Counter(name, metric.WithUnit(unit), metric.WithDescription(description))
	if err != nil {
		otel.Handle(err)
	}

	return counter
}

//nolint:ireturn // the SDK hands back the instrument interface
func mustUpDownCounter(
	meter metric.Meter,
	name, unit, description string,
) metric.Int64UpDownCounter {
	counter, err := meter.Int64UpDownCounter(name, metric.WithUnit(unit), metric.WithDescription(description))
	if err != nil {
		otel.Handle(err)
	}

	return counter
}

//nolint:ireturn // the SDK hands back the instrument interface
func mustFloatHistogram(
	meter metric.Meter,
	name, unit, description string,
) metric.Float64Histogram {
	histogram, err := meter.Float64Histogram(name, metric.WithUnit(unit), metric.WithDescription(description))
	if err != nil {
		otel.Handle(err)
	}

	return histogram
}

//nolint:ireturn // the SDK hands back the instrument interface
func mustIntHistogram(
	meter metric.Meter,
	name, unit, description string,
) metric.Int64Histogram {
	histogram, err := meter.Int64Histogram(name, metric.WithUnit(unit), metric.WithDescription(description))
	if err != nil {
		otel.Handle(err)
	}

	return histogram
}

func HTTPAttributes(method, route string, status int) []attribute.KeyValue {
	return []attribute.KeyValue{
		attribute.String(AttrMethod, method),
		attribute.String(AttrRoute, route),
		attribute.Int(AttrStatus, status),
	}
}

func InFlightAttributes(method, route string) []attribute.KeyValue {
	return []attribute.KeyValue{
		attribute.String(AttrMethod, method),
		attribute.String(AttrRoute, route),
	}
}

func WorkerAttributes(job, outcome string) []attribute.KeyValue {
	return []attribute.KeyValue{
		attribute.String(AttrJob, job),
		attribute.String(AttrOutcome, outcome),
	}
}

func LedgerAttributes(source string) []attribute.KeyValue {
	return []attribute.KeyValue{attribute.String(AttrSource, source)}
}

func CaptureAttributes(kind, outcome string) []attribute.KeyValue {
	return []attribute.KeyValue{
		attribute.String(AttrKind, kind),
		attribute.String(AttrOutcome, outcome),
	}
}

func ImportClashAttributes(kind string) []attribute.KeyValue {
	return []attribute.KeyValue{attribute.String(AttrClashKind, kind)}
}

func SQLiteAttributes(operation string) []attribute.KeyValue {
	return []attribute.KeyValue{attribute.String(AttrOperation, operation)}
}

func RecordHTTPRequest(
	ctx context.Context,
	method, route string,
	status int,
	duration time.Duration,
) {
	set := instruments()
	attrs := metric.WithAttributes(HTTPAttributes(method, route, status)...)

	set.httpRequests.Add(ctx, 1, attrs)
	set.httpDuration.Record(ctx, duration.Seconds(), attrs)
}

func AddHTTPInFlight(ctx context.Context, method, route string, delta int64) {
	attrs := metric.WithAttributes(InFlightAttributes(method, route)...)

	instruments().httpInFlight.Add(ctx, delta, attrs)
}

func RecordWorkerRun(ctx context.Context, job, outcome string, items int64, duration time.Duration) {
	set := instruments()
	attrs := metric.WithAttributes(WorkerAttributes(job, outcome)...)

	set.workerRuns.Add(ctx, 1, attrs)
	set.workerItems.Add(ctx, items, attrs)
	set.workerDuration.Record(ctx, duration.Seconds(), attrs)
}

func RecordLedgerPost(ctx context.Context, source string, postings int64) {
	set := instruments()
	attrs := metric.WithAttributes(LedgerAttributes(source)...)

	set.entries.Add(ctx, 1, attrs)
	set.postings.Add(ctx, postings, attrs)
}

func RecordCaptureTransition(ctx context.Context, kind, outcome string) {
	attrs := metric.WithAttributes(CaptureAttributes(kind, outcome)...)

	instruments().captures.Add(ctx, 1, attrs)
}

func RecordImportRows(ctx context.Context, rows int64) {
	instruments().importRows.Add(ctx, rows)
}

func RecordImportClash(ctx context.Context, kind string) {
	attrs := metric.WithAttributes(ImportClashAttributes(kind)...)

	instruments().importClashes.Add(ctx, 1, attrs)
}

func RecordExportBytes(ctx context.Context, size int64) {
	instruments().exportBytes.Record(ctx, size)
}

func RecordSQLiteLocked(ctx context.Context, operation string) {
	attrs := metric.WithAttributes(SQLiteAttributes(operation)...)

	instruments().sqliteLocked.Add(ctx, 1, attrs)
}
