# Observability

Three signals, one vocabulary, no per-request guesswork. This page explains the wiring, the
names, and how a log line finds its span. The rules that bind a change live in
[`AGENTS.md`](../AGENTS.md#observability); this is the how.

## Wiring

`OTEL_EXPORTER_OTLP_ENDPOINT` is the only switch. Empty means every signal is a no-op, so
development needs no collector. A bare host is **HTTPS**; write `http://` on purpose.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ./spenicle http
```

Each command names itself before the graph is built, in `internal/common/config/process.go`:

| command | `service.name` | `spenicle.component` |
| --- | --- | --- |
| `spenicle http` | `spenicle-http` | `http` |
| `spenicle worker` | `spenicle-worker` | `worker` |
| `spenicle all` (local only) | `spenicle` | `http` |

The command calls `telemetry.SetIdentity(serviceName, version, component)` before
`config.Start`; that is what makes `service.name` the tracer name and what `StartSpan` stamps on
every span as `spenicle.version` + `spenicle.component`, so no call site repeats them.

`telemetry.Setup` then builds one `TracerProvider` and one `MeterProvider` over OTLP/HTTP,
installs both globally, starts the Go runtime instruments (`otelruntime`) and returns the
shutdown that `config.Process.Close` flushes with `context.WithoutCancel` — the signal that
stops the process has already cancelled the root context, and without this the last batch is
lost.

## Signals

### Traces

One span per boundary method, named `<Layer>.<Receiver>.<Method>`:
`Handler.Entries.List` → `Module.Ledger.List` → `Repository.Sqlite.ListEntries` →
`Repository.Sqlite.postingsByEntryIDs`. Validation, formatting and other pure functions open
none. Outgoing vendor calls (ECB, SnapToJSON, OpenAI) are wrapped in
`otelhttp.NewTransport`, so each is its own child span with the vendor's real status.

The HTTP entry span belongs to `httpx.Observe`: it names the request with the router's
**pattern** (`GET /api/entries/{ref}` never the raw path), sets `http.request.method`,
`http.route`, `http.response.status_code`, and marks a 5xx with `codes.Error`.

`http` and `worker` are separate processes and cannot share a trace by accident: each opens its
own root span (`Worker.Recurring.Run` per tick). A job that crosses the boundary carries the
caller's W3C `traceparent` on its row and the worker resumes it as a remote parent.

### Metrics

All prefixed `spenicle.`, dotted lowercase, the unit in the instrument option and never in the
name. Attributes are bounded enums only — a ref, a name or an amount in an attribute is a
defect.

| instrument | kind | unit | attributes |
| --- | --- | --- | --- |
| `spenicle.http.server.requests` | counter | `{request}` | `http.request.method`, `http.route`, `http.response.status_code` |
| `spenicle.http.server.duration` | histogram | `s` | same three |
| `spenicle.http.server.in_flight` | updowncounter | `{request}` | `http.request.method`, `http.route` |
| `spenicle.worker.runs` | counter | `{run}` | `spenicle.job`, `spenicle.outcome` |
| `spenicle.worker.items` | counter | `{item}` | `spenicle.job`, `spenicle.outcome` |
| `spenicle.worker.run.duration` | histogram | `s` | `spenicle.job`, `spenicle.outcome` |
| `spenicle.ledger.entries` | counter | `{entry}` | `spenicle.entry.source` |
| `spenicle.ledger.postings` | counter | `{posting}` | `spenicle.entry.source` |
| `spenicle.captures.transitions` | counter | `{transition}` | `spenicle.capture.kind`, `spenicle.outcome` |
| `spenicle.imports.rows` | counter | `{row}` | — |
| `spenicle.imports.clashes` | counter | `{clash}` | `spenicle.clash.kind` |
| `spenicle.exports.bytes` | histogram | `By` | — |
| `spenicle.sqlite.locked` | counter | `{retry}` | — |

`spenicle.job` is one of `recurring|artifacts|imports|exports|sweep`;
`spenicle.outcome` is `ok|failed|skipped` for a worker step and the resulting status for a
capture transition. Plus `otelruntime`, which publishes the Go runtime metrics under its own
`runtime.` namespace.

The instrument set is created once, lazily, against the provider `Setup` installed
(`internal/common/otel/metrics.go`). A test asserts the attribute mapping functions, not the
exporter.

### Logs

One logger, `internal/common/logging`, levels fixed (no knob): `Debug` hot-loop detail, `Info`
branch outcomes and lifecycle, `Warn` degraded-but-recovered, `Error` only when a request
returns 5xx or work is dropped.

```go
logger := logging.New(telemetry.ComponentHTTP)   // or logging.From(handler, component)

logger.Info(ctx, "listening", slog.String("addr", addr))
```

Every record carries `component`, then `trace_id` and `span_id` when the context holds a valid
span, then the caller's attributes — emitted through `LogAttrs`, so keys stay typed and
consistent.

## The dashboard

[`config/grafana/observability.json`](../config/grafana/observability.json) is the provisioned
dashboard: request rate and 5xx ratio, latency p95 by route, worker runs by job, the heartbeat
age, ledger entries by source, captures by outcome, import clashes, export document size,
SQLite lock retries and the slowest traces. It expects two datasources, selected with the
`datasource` (Prometheus) and `traces` (Tempo) variables.

```bash
# a collector that fans OTLP out to Prometheus and Tempo, then a dashboard import:
curl -s http://localhost:3000/api/dashboards/db \
  -H 'content-type: application/json' \
  -d "{\"dashboard\": $(cat config/grafana/observability.json), \"overwrite\": true}"
```

The panels query Prometheus names the OTLP exporter derives: dots become underscores and a
counter gains `_total`, so `spenicle.http.server.requests` is
`spenicle_http_server_requests_total` and `spenicle.job` is `spenicle_job`.

The heartbeat panel reads `spenicle_worker_last_run_timestamp_seconds`, which nothing exports
today: `worker_last_run_at` lives in the `settings` row that `/healthz` reports, so publish it
with a textfile exporter or a probe of `GET /healthz` if you want the panel lit. Until then the
panel is empty, not wrong.

## Joining a log line to its span

`trace_id` on the record **is** the `trace_id` in Tempo. Copy it into the trace search:

1. A request answers `500` and logs `request failed` with `component=http trace_id=… span_id=…`.
2. Paste `trace_id` into the Tempo explore query `{ traceId = "…" }`.
3. The span the record names (`span_id`) is highlighted; its siblings are the module and
   repository calls that answered.

That is the whole story: no per-request ID, no second correlation column.
