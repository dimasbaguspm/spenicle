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
dashboard, built to the RED standard: every panel answers **R**ate, **E**rrors or **D**uration
for one dimension, with the saturation and domain panels beside them. It expects two
datasources, selected with the `datasource` (Prometheus) and `traces` (Tempo) variables.
Every panel carries an explicit no-data fallback in `fieldConfig.defaults.noValue` —
`No requests` on the HTTP rate, error and latency panels, `No data` on the stat, table,
worker and domain panels — so an idle window reads as a stated empty state instead of a
blank box, and a RED panel that is dark is never mistaken for a broken query.

```bash
# a collector that fans OTLP out to Prometheus and Tempo, then a dashboard import:
curl -s http://localhost:3000/api/dashboards/db \
  -H 'content-type: application/json' \
  -d "{\"dashboard\": $(cat config/grafana/observability.json), \"overwrite\": true}"
```

### Panels and their PromQL

| row | panel | PromQL |
| --- | --- | --- |
| RED — availability | Availability now (stat, `percent`, green ≥ 99, amber ≥ 95) | `100 * sum(rate(spenicle_http_server_requests_total{http_response_status_code!~"5.."}[5m])) / sum(rate(spenicle_http_server_requests_total[5m]))` |
| | Success ratio (timeseries) | same expression, range |
| | Request rate by route (`reqps`) | `sum by (http_route) (rate(spenicle_http_server_requests_total[5m]))` |
| | Error rate (5xx) by route (`percent`) | `100 * sum by (http_route) (rate(spenicle_http_server_requests_total{http_response_status_code=~"5.."}[5m])) / sum by (http_route) (rate(spenicle_http_server_requests_total[5m]))` |
| | Client error rate (4xx) by route (`percent`) | the same with `4..` |
| | Latency quantiles by route (`s`, p50/p90/p95/p99) | `histogram_quantile(0.95, sum by (le, http_route) (rate(spenicle_http_server_duration_seconds_bucket[5m])))` (and `0.50`, `0.90`, `0.99`) |
| | Average latency by route (`s`) | `sum by (http_route) (rate(spenicle_http_server_duration_seconds_sum[5m])) / sum by (http_route) (rate(spenicle_http_server_duration_seconds_count[5m]))` |
| Every route in one glance | Routes: rate, errors, latency (table) | four instant queries: the rate, the 5xx ratio, the average and the p95 above, then `merge` → `organize` (rename `Value #A…D`, `http_route` → `route`) → `sortBy` `error %` descending |
| Saturation | In-flight requests | `sum by (http_route) (spenicle_http_server_in_flight)` |
| | SQLite lock retries | `sum(rate(spenicle_sqlite_locked_total[5m]))` |
| Worker | Runs by job and outcome | `sum by (spenicle_job, spenicle_outcome) (rate(spenicle_worker_runs_total[5m]))` |
| | Items by job | `sum by (spenicle_job) (rate(spenicle_worker_items_total[5m]))` |
| | Run duration p95 (`s`) | `histogram_quantile(0.95, sum by (le, spenicle_job) (rate(spenicle_worker_run_duration_seconds_bucket[5m])))` |
| | Heartbeat age (stat, `s`) | `time() - max(spenicle_worker_last_run_timestamp_seconds)` |
| Domain | Ledger entries by source | `sum by (spenicle_entry_source) (rate(spenicle_ledger_entries_total[5m]))` |
| | Captures by outcome | `sum by (spenicle_capture_kind, spenicle_outcome) (rate(spenicle_captures_transitions_total[5m]))` |
| | Import rows and clashes | `sum(rate(spenicle_imports_rows_total[5m]))` and `sum by (spenicle_clash_kind) (rate(spenicle_imports_clashes_total[5m]))` |
| | Export document size p95 (`bytes`) | `histogram_quantile(0.95, sum by (le) (rate(spenicle_exports_bytes_bucket[5m])))` |
| Traces | Top spans by duration (Tempo table) | TraceQL `{ }`, limit 20 |

The route dimension is the **`http_route`** label — the router's pattern
(`GET /api/entries/{ref}`), never the raw path — and it is the only per-route dimension any
panel groups by. The status dimension is `http_response_status_code`, the worker's are
`spenicle_job` and `spenicle_outcome`.

The panels query Prometheus names the OTLP exporter derives: dots become underscores, a
counter gains `_total`, a histogram gains `_bucket`/`_sum`/`_count`, and the unit suffix is
appended once — `spenicle.http.server.duration` with unit `s` is
`spenicle_http_server_duration_seconds_bucket`, and `spenicle.exports.bytes` with unit `By`
is `spenicle_exports_bytes_bucket` (the `_bytes` suffix is not doubled). Labels follow the
same rule: `spenicle.job` is `spenicle_job`.

The heartbeat panel reads `spenicle_worker_last_run_timestamp_seconds`, which nothing exports
today. The durable source is `worker_last_run_at` in `settings`, written by the worker only
after every stage in a run has finished and reported by `GET /healthz`; publish it with a
textfile exporter or a probe of `/healthz` if you want the panel lit. Until then the panel
reads `No data`, not wrong. The same endpoint reports this process's `version` and
`started_at`, and `GET /api/audit?entity_kind=system&action=start` holds one durable row per
boot, which is how an operator identifies the build and start of an earlier process.

## Joining a log line to its span

`trace_id` on the record **is** the `trace_id` in Tempo. Copy it into the trace search:

1. A request answers `500` and logs `request failed` with `component=http trace_id=… span_id=…`.
2. Paste `trace_id` into the Tempo explore query `{ traceId = "…" }`.
3. The span the record names (`span_id`) is highlighted; its siblings are the module and
   repository calls that answered.

That is the whole story: no per-request ID, no second correlation column.
