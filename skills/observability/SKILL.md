---
name: observability
description: Wire Spenicle to an OTLP collector, read its traces and metrics, and debug a missing or misnamed span.
---

# Observability

Tracing and metrics are OpenTelemetry, no-ops until an endpoint is configured.
Code lives in [`internal/common/otel`](../../internal/common/otel/otel.go); the
naming rules are in [`docs/v2-design.md`](../../docs/v2-design.md).

## 1. Point it at a collector

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com:4318   # production
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318           # local, plaintext
```

- **HTTPS is the default.** A bare host (`otel.example.com`) is treated as HTTPS on
  port `4318`. `http://` has to be written on purpose — `ParseEndpoint` is the one
  place that decides, and it is unit-tested.
- A path is dropped; OTLP/HTTP endpoints are scheme + host + port.
- Empty means the providers are never installed: zero overhead, which is why tests
  and `make run` need no collector.
- Port 4317 is gRPC. This binary uses **OTLP/HTTP** (`4318`); pointing it at a gRPC
  port fails at export time, not at boot.

Minimal local collector:

```bash
docker run --rm -p 4318:4318 otel/opentelemetry-collector:latest \
  --config=/etc/otelcol/config.yaml   # any config with the otlphttp receiver
```

## 2. What it emits

| signal | name | notes |
| --- | --- | --- |
| trace | `Handler.Entries.Post`, `Handler.Health.Check` | one per request, from the handler |
| trace | `GET /healthz` etc. | request span, from `middlewares.Observe` |
| trace | `Module.Ledger.Post` | business call |
| trace | `Repository.Sqlite.*` | one per database method, including `WithTx` |
| trace | `Common.Config.Load`, `Common.Seal.Seal`, `Common.Seal.Open` | utilities that cross a boundary |
| trace | `Repository.Snaptojson.Posting` | billed submit of a document |
| trace | `Repository.Snaptojson.Polling` | free read-back of a snap by `job_ref` |
| trace | `Repository.OpenAI.Posting` | one vision call, no polling |
| metric | OTel SDK defaults | runtime metrics once a meter provider exists |

The service name is one string: `entity.AppConfig.ServiceName`
(`DefaultServiceName = "spenicle"`). It becomes `resource.service.name` **and** the
tracer name — a span can never be labelled with a different service than the
resource.

Layer prefixes exist so a trace reads like the call stack:

```
Handler.Entries.Post
  Module.Ledger.Post
    Repository.Sqlite.BaseCurrencyCode
    Repository.Sqlite.InsertEntry
      Repository.Sqlite.WithTx
```

## 3. Debug a missing span

| symptom | check |
| --- | --- |
| no spans at all | `OTEL_EXPORTER_OTLP_ENDPOINT` empty? `/healthz` up but SDK never installed |
| spans stop at shutdown | flush must use `context.WithoutCancel`; the signal already cancelled the root ctx |
| export fails silently | endpoint is HTTPS but the collector is plaintext — add `http://` explicitly |
| span named `Repository.Sqlite.` (empty) | a call site built the name by concatenation; call `telemetry.StartSpan(ctx, "Repository.Sqlite.Thing")` with the full string |
| no handler span | the request failed before the `Server` method ran; check the middleware order in `cmd/http/handler.go` |

Rules the code enforces:

1. Every boundary method takes `ctx` first and opens **one** span via
   `telemetry.StartSpan` — no local `startSpan` wrapper.
2. Pure value code (`entity`, `clock`) opens nothing: no boundary, nothing to trace.
3. `type` and `name` are constants, not per-request strings: low cardinality or the
   collector bill explodes.

## 4. Prove it works

```bash
go test ./internal/common/otel/ ./internal/repository/sqlite/ -run 'ParseEndpoint|SpansAreNamed' -v
```

`TestSpansAreNamed` installs a recording provider and asserts
`Repository.Sqlite.SchemaVersion` is emitted; `TestParseEndpoint` pins the
HTTPS-by-default rule. For an end-to-end check, run the binary against a throwaway
HTTP listener on 4318 and confirm `/v1/traces` and `/v1/metrics` POSTs arrive.
