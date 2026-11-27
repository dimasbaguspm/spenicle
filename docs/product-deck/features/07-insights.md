# F7 — How did the month go

**Status** partial — duplicate saved-view `409` is covered by UAT; default windows follow `APP_TIMEZONE` · **Client** home screen, month bars, category pie, saved views
**Routes** `GET /api/dashboard` · `GET /api/analytics/months` · `GET /api/analytics/categories` · `POST /api/analytics/custom` · `GET /api/analytics/custom/{ref}` · `PATCH /api/analytics/custom/{ref}`

## 1. The job the user has

"Open the app, see the month in one screen, and only then drill." The point of the
feature is that nothing here is stored: every tile and every bar is a query over
postings, so a void, a correction or a late import moves the numbers on the next read and
never needs a recalculation job.

## 2. Client journeys (multi-hit by design)

### 2.1 The landing screen

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/dashboard?from=2026-02-01&to=2026-02-28` | one request, explicit window capped at 366 days |

```json
{"from":"2026-02-01","to":"2026-02-28","base_currency":"IDR","month":"2026-02",
 "spend_minor":"10000","income_minor":"0","net_minor":"-10000",
 "months":[{"month":"2026-02","spend_minor":"10000","income_minor":"0","net_minor":"-10000"}],
 "pending_captures":0,
 "top_category":{"account_ref":"…","account_name":"Unsorted","amount_minor":"10000"}}
```

`month` is the **newest month with data inside the requested window**, not necessarily
the current calendar month: an empty February shows January. An empty window answers
zeroes and omits `top_category` — never an error. `months` carries every month in the
window that has data, oldest first, so the landing screen does not need a second call for
the trend. `top_category` is the biggest expense category in that window;
`pending_captures` counts pending captures received in the same window. The response
echoes `from` and `to`, so the client never has to guess which window it rendered.

### 2.2 Drill into months and categories

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/analytics/months` | default window: first day of the month 11 months ago → today, both derived from the clock in `APP_TIMEZONE` |
| 2 | `GET /api/analytics/months?from=2026-01-01&to=2026-12-31` | any range, unbounded allowed |
| 3 | `GET /api/analytics/categories?from=&to=&kind=expense` | default `kind=expense`; `income` flips the pie |
| 4 | tap a bar → `GET /api/entries?from=<month start>&to=<month end>` | the drill-down is the ledger, which already filters by date |

```json
{"from":"2026-01-01","to":"2026-02-28","months":[
  {"month":"2026-01","spend_minor":"10000","income_minor":"0","net_minor":"-10000"}]}
```

```json
{"from":"2026-02-01","to":"2026-02-28","kind":"expense","categories":[
  {"account_ref":"…","account_name":"Unsorted","amount_minor":"25000"}]}
```

`spend_minor` sums `base_amount_minor` on `expense` accounts, `income_minor` negates it on
`income` accounts, `net_minor` is income minus spend. All strings. Categories are ordered
by amount descending and a category that nets to zero is dropped.

### 2.3 Save a view

| # | call | body |
| --- | --- | --- |
| 1 | `POST /api/analytics/custom` | `{"name":"Spend per month","namespace":"months","chart":"bar"}` |
| 2 | `GET /api/analytics/custom/{ref}?from=&to=` | runs it; the response echoes `query` so the client knows which chart to draw |
| 3 | `PATCH /api/analytics/custom/{ref}` | `{"name":"…","chart":"pie"}`; `namespace` is immutable |

A saved view stores **what to ask**, not SQL: `namespace` is `months` or `categories`,
`chart` is `bar`, `line` or `pie`. A `categories` view always asks for `expense`; an income
pie needs a namespace the API does not have yet.

## 3. Backend, end to end

```
GET /api/dashboard?from&to      Handler.Dashboard.Get → Settings.Load (base currency)
                              + MonthlyTotals (window) + CaptureCount (window)
                              + CategoryTotals (window, top category)
GET /api/analytics/months     Handler.Analytics.Months → MonthlyTotals
GET /api/analytics/categories Handler.Analytics.Categories → CategoryTotals(kind)
POST /api/analytics/custom    Handler.Analytics.CreateCustom → CreateCustomQuery
GET  /api/analytics/custom/{r} Handler.Analytics.RunCustom → CustomQueryByRef
                              → MonthlyTotals | CategoryTotals
PATCH/api/analytics/custom/{r} Handler.Analytics.PatchCustom → UpdateCustomQuery
```

- **One grouped query per question.** `MonthlyTotals` groups postings by month,
  `CategoryTotals` groups by account and filters `kind`. Both join `ledger_postings` →
  `ledger_entries` → `accounts` and **exclude voided entries and their reversals**, so a
  corrected entry leaves no trace in a chart while the rows remain.
- **Nothing is materialised.** There is no `months` table, no daily rollup, no cache to
  invalidate: a correction is visible on the next read by construction.
- **Base currency only.** Every figure is `base_amount_minor`, so a USD entry is already
  converted with the rate it was posted with. A chart never mixes currencies.
- **Four queries per dashboard call**, no caching. At one user's volume that is the right
  trade: correctness over a cache invalidation scheme.

## 4. RRR

### Requirements

1. A void must not change any figure: the voided entry and its reversal are both excluded
   from every aggregate.
2. Every money field is a minor-unit **string**; the client formats, the API never does.
3. The dashboard client supplies one explicit, ordered `from`/`to` window; every tile
   uses it and the response echoes both dates. Months and categories keep their
   twelve-month defaults in `APP_TIMEZONE` when the client omits a window.
4. An empty ledger answers zeroes and an omitted `top_category`, never a `404`.
5. `month` on the dashboard is the newest month **with data**; the client must label the
   tile from that field, not from its own clock.
6. Saved views are addressable: `ref` is stable, the response always echoes the stored
   `query`, and `namespace` never changes.
7. Every figure is derived from postings at read time — no stored total, no nightly job.
8. `categories?rollup=parent` is opt-in; without it, a parent reports only its own
   postings.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| the dashboard month is not "this month" | a tile labelled "February" that shows January's numbers reads as a bug | render the month name from `month`; when `month` is earlier than the client's current month, say "last month with activity" |
| category totals depend on `kind` | an expense posted against an `asset` account (a cash purchase logged as a transfer) shows in no category and as no spend, though the balance is right | the entry form should push the two-leg shape (asset → expense); the pie is not the place to reconcile |
| one bad custom name | `custom_queries.name` is unique | create and patch answer `409 duplicate`; committed custom-query UAT covers create, namespace, unknown namespace and the collision (`POST_api_analytics_custom.feature` asserts `409 duplicate`) |
| an unbounded range is allowed | `?from=1970-01-01` is a full scan | the client should always send an explicit window; the default is already the useful one |
| `categories` views cannot be income | a user saving an income pie gets expenses | `GET /api/analytics/categories?kind=income` works; the **saved** view cannot carry `kind` yet ([F9](./09-gaps-and-next.md)) |
| parent roll-up can double-count | a parent with its own postings plus children | `?rollup=parent` is opt-in on `categories`; the flat view still reports each account alone |

### Rollout

1. **Ship the dashboard tile first.** One call with an explicit window, all the numbers
   a home screen needs — the cheapest possible "the app is alive and knows my money".
2. **Then the two namespaces**, each with a window the client controls.
3. **Saved views last.** They are a convenience over routes that already work, and they
   are the only place where a name collision is possible.
4. Rollback: hide the chart screens; the dashboard and the ledger are independent of them
   and no route here writes anything except a saved view.

## 5. Acceptance criteria

```gherkin
Scenario: The dashboard derives its tiles from the requested window
  Given an entry spending "10000" in "2026-02"
  When I send a GET to "/api/dashboard?from=2026-02-01&to=2026-02-28"
  Then the response status is 200
  And the response echoes from "2026-02-01" and to "2026-02-28"
  And the response body has month "2026-02"
  And the response body has spend_minor "10000"
  And the response body has net_minor "-10000"
  And top_category names "Unsorted"

Scenario: An empty ledger answers zeroes
  Given an empty ledger
  When I send a GET to "/api/dashboard?from=2026-02-01&to=2026-02-28"
  Then the response status is 200
  And spend_minor, income_minor and net_minor are "0"
  And top_category is absent

Scenario: A void disappears from every chart
  Given an entry spending "10000" in "2026-02"
  When I void that entry
  And I send a GET to "/api/analytics/months?from=2026-02-01&to=2026-02-28"
  Then the month "2026-02" carries spend_minor "0"
  When I send a GET to "/api/dashboard?from=2026-02-01&to=2026-02-28"
  Then spend_minor is "0"

Scenario: Months answer one row per month with a zero net
  When I send a GET to "/api/analytics/months?from=2026-01-01&to=2026-02-28"
  Then each month carries spend_minor, income_minor and net_minor as strings
  And net_minor is income_minor minus spend_minor

Scenario: Categories are ordered and zero rows are dropped
  Given two expense categories, one with "25000" and one with "0"
  When I send a GET to "/api/analytics/categories"
  Then the first category carries amount_minor "25000"
  And the zero category is absent

Scenario: A saved view runs with the same shape it was saved with
  When I send a POST to "/api/analytics/custom" with:
    """json
    {"name":"Spend per month","namespace":"months","chart":"bar"}
    """
  Then the response status is 201
  When I send a GET to "/api/analytics/custom/{{ref}}?from=2026-01-01&to=2026-02-28"
  Then the response body echoes query.chart "bar"
  And the response body carries the "months" array, omitted when the window has no rows

Scenario: A report window is validated
  When I send a GET to "/api/dashboard"
  Then the response status is 422
  And the error code is "invalid_request"
  When I send a GET to "/api/analytics/months?from=2026-13-01"
  Then the response status is 422
  And the error code is "invalid_request"
```

## 6. What this page does not promise

- No fiscal-month offset: entries carry a date, not a time, so a month is always the calendar month on the entry. Which *day* a default window ends on, and what `to` includes, follows `APP_TIMEZONE`.
- No parent roll-up on `months`, no per-account split, no currency breakdown.
  `categories` has opt-in `rollup=parent`.
- No caching, no materialised rollups, no incremental refresh.
- `categories` saved views are always expense; `months` saved views always carry all
  four fields.
- No `DELETE` of a saved view.
