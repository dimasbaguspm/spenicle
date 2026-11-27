# F10 — Categories that land in the same place every time

**Status** partial (suggest/rules and approve-learning live; recurring drafts and import learning are not) · **Client** capture review, entry form, rules screen, category chart
**Routes** `GET /api/categorization/suggest` · `GET|POST /api/categorization/rules` · `PATCH /api/categorization/rules/{ref}` · `PATCH /api/captures/{ref}` (learning) · `GET /api/analytics/categories` (`first_occurred_on`, `last_occurred_on`, `bucket=month`)

## 1. The job the user has

"`KOPI KENANGAN` is *Personal food*, `WHISKAS` is *Cat*, `INDOMARET` is *Grocery* — and I want
that to be true without me thinking about it, every time, on every screen." Two follow-ups:
how much went to each category, since when, and per month.

Consistency is the feature; the chart already existed. Nothing here is a model: a merchant
gets one remembered default and, when that is not enough, an explicit rule.

## 2. Client journeys (multi-hit by design)

### 2.1 A capture teaches the ledger once

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/payees?query=kopi` | the picker; each row carries `default_category_ref` when it has one |
| 2 | `POST /api/captures` | one share, nothing else |
| 3 | `PATCH /api/captures/{ref}` `{"action":"approve","payee_ref":"…","postings":[…]}` | the human picks the category |
| 4 | — | the server remembers: the payee's empty `default_category_ref` becomes the category that was posted |

The learning is **first-wins**: it only fills an empty default, never overwrites one, and
`{"learn": false}` opts a single approval out. It is journaled as a `payee/update`.

### 2.2 Ask before you type

```json
GET /api/categorization/suggest?payee_ref=<kopi>&kind=expense&text=KOPI%2018.000
200 {"account_ref":"…","account_name":"Personal food","why":"payee default","tier":"payee_default"}
```

`tier` is one of `payee_default`, `rule_exact`, `rule_contains`, `none`; `rule_ref` appears
when a rule matched. Without `payee_ref`, `text` is used as both the name and the note — that
is what a share sheet or an import row has. Nothing is written.

### 2.3 Rules for what a default cannot catch

| # | call | body |
| --- | --- | --- |
| 1 | `POST /api/categorization/rules` | `{"pattern":"whiskas","field":"payee","match_kind":"contains","category_ref":"<cat>"}` |
| 2 | `GET /api/categorization/rules?account_ref=<cat>` | the rules of one category, `meta` paged like every list |
| 3 | `PATCH /api/categorization/rules/{ref}` | `{"pattern"?, "category_ref"?, "priority"?, "archived"?}` |

Patterns are trimmed, lowercased, 2–80 characters; `field` is `payee` or `note`, and note
rules accept only `contains`/`prefix` (`exact` is `422 invalid_request`: "a note rule matches
contains or prefix, never exact"). `exact`, `contains` and `prefix` apply to payee rules.
A duplicate live rule is `409 duplicate`; a category that is not `expense`/`income` is
`422 invalid_request`; an unknown `category_ref` is `404 not_found`.

### 2.4 How big, since when, per month

| # | call | answers |
| --- | --- | --- |
| 1 | `GET /api/analytics/categories?from=&to=` | spend per category, plus `first_occurred_on` and `last_occurred_on` |
| 2 | `GET /api/analytics/categories?from=&to=&bucket=month` | `{"from":"…","to":"…","kind":"…","bucket":"month","categories":[{account_ref, account_name, months:[{month, spend_minor}]}]}` |
| 3 | `GET /api/analytics/categories?rollup=parent` | a parent sums its children (F4) |

`bucket` and `rollup` cannot be combined (`422 invalid_request`, the message names both).

## 3. Backend, end to end

```
GET  /api/categorization/suggest  Handler.Categorization.Suggest → Module.Categorization.Resolve
                                  → Repository.Sqlite.ListLiveRules + Payees.PayeeByRef
                                  → pure Suggest(...)  (no writes, no span inside the resolver)
POST /api/categorization/rules    → Module.Categorization.Create → CreateRule (+ audit create)
PATCH/api/categorization/rules/{r}→ Module.Categorization.Update → UpdateRule (+ audit update)
PATCH/api/captures/{ref} approve  → Handler.rememberCategory → Payees.PayeeByRef → Accounts.AccountByRef
                                  → Payees.UpdatePayee (only when the default is empty)
GET  /api/analytics/categories    → CategoryTotals | CategoryTotalsByRoot | CategoryTotalsByMonth
```

- **One ladder on the suggest and create paths, not configurable.** payee default →
  `exact` rule on the payee name → `contains`/`prefix` on the payee name or note → `none`.
  Inside a tier: `priority DESC`, pattern length `DESC`, `created_at ASC`. `GET
  /api/categorization/suggest` explains the match with `tier` and `why`; `POST /api/captures`
  and `POST /api/imports` carry `suggested_category_ref` when resolution succeeds. `GET
  /api/captures` rows do not, and recurring drafts bypass the resolver: the worker uses
  `rule.CategoryRef` or `Unsorted` directly.
- **Rules are refs + rows.** `categorization_rules` points at an account (`expense`/
  `income` only) with a partial unique index over live rules; every write appends
  `categorization_rule/create|update`. A rule whose category was archived is skipped.
- **Learning is not a write on the suggestion path.** Only a capture approval, with the
  category a human actually posted, fills `payees.default_category_ref` — and only when it
  is empty. Import commits do not learn.
- **The chart stays derived.** `first_occurred_on` is `MIN(occurred_on)` over the same
  void-excluding join; `bucket=month` groups by `substr(occurred_on,1,7)`. No counters, no
  rollup table, so a correction moves every number on the next read.

## 4. RRR

### Requirements

1. The same merchant resolves the same category on the suggest route and the capture/import
   create prefill — one pure resolver, table-tested with the golden cases. Recurring drafts
   use `rule.CategoryRef` and are outside this path.
2. A suggestion never writes the ledger. `approve` and `commit` remain the only writes.
3. Learning fills an **empty** payee default only, is journaled, and can be skipped per
   approval with `{"learn": false}`.
4. A rule must point at an `expense`/`income` account; an archived category is never applied.
5. `exact`, `contains`, `prefix` only — no regex, no inference from amount, day or account.
6. Every suggestion explains itself: `tier` always, `rule_ref` when a rule fired.
7. Category spend is a query: `first_occurred_on`/`last_occurred_on` and the monthly bucket
   come from postings, not from a stored aggregate.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a wrong default is sticky | every future `KOPI` inherits it | first-wins is visible on the payee sheet and one `PATCH /api/payees/{ref}` away |
| two categories both fit | ambiguity is real, not a bug | the suggestion is always editable, `why` names the source, and `rule_ref` makes a bad rule identifiable |
| a broad pattern swallows the ledger | `pattern: "a"` | 2–80 characters, a 200-rule live cap, tie-break prefers the longer pattern |
| note rules misfire on free text | the note is prose | payee rules always outrank note rules, and the tier says which one fired |
| learning on import | a bulk commit could write 200 defaults *suggested* by nobody | import learning is **not** wired in this version — only an approval learns |

### Rollout

1. **Learning on approve** (shipped, no schema change).
2. **Rules + suggest** (shipped, migration `0001`). Additive routes and two scopes.
3. **Per-month bucket and first/last** (shipped). Additive fields on an existing route.
4. **Not shipped**: import-row learning, `field: note` with `match_kind: exact`, a dry-run
   "these 40 entries would move" report, and resolver-based recurring drafts.

## 5. Acceptance criteria

```gherkin
Scenario: Approving a capture remembers the payee's category
  Given a payee "Kopi Kenangan" with no default category
  And a pending capture "KOPI KENANGAN 18.000"
  When I approve it with that payee and a category posting
  Then the payee carries a default_category_ref

Scenario: Learning can be turned off for one approval
  When I approve a capture with "learn": false
  Then the payee still has no default_category_ref

Scenario: A payee default beats a rule
  Given a payee default of "Personal food" and a rule matching "kopi" to "Grocery"
  When I ask for a suggestion for that payee
  Then the suggestion is "Personal food" with tier "payee_default"

Scenario: The longer pattern wins the tie-break
  Given two contains rules on the payee name, "kopi" and "kopi kenangan"
  When I ask for a suggestion for "KOPI KENANGAN"
  Then the suggestion names the longer rule and its rule_ref

Scenario: A rule on an archived category is skipped
  Given a rule whose category is archived
  When I ask for a suggestion that would match it
  Then the suggestion comes from a live rule, never the archived one

Scenario: No match answers none
  When I ask for a suggestion for a merchant nobody has filed
  Then the tier is "none" and the category is "Unsorted"

Scenario: A duplicate live rule is refused
  When I create the same pattern, field and match kind twice
  Then the response status is 409
  And the error code is "duplicate"

Scenario: Category spend reports its first day and per-month split
  Given an entry in January and an entry in February for the same category
  When I send a GET to "/api/analytics/categories?from=2026-01-01&to=2026-02-28"
  Then the category carries first_occurred_on "2026-01-05" and last_occurred_on "2026-02-20"
  When I send a GET to the same range with "bucket=month"
  Then the category carries one month per entry

Scenario: A bucket and a roll-up cannot be asked for together
  When I send a GET to "/api/analytics/categories?bucket=month&rollup=parent"
  Then the response status is 422
```

## 6. What this page does not promise

- No regex, no fuzzy matching, no learning from amounts, dates or frequencies.
- No auto-posting: a suggestion is a read; a category is applied only by `approve` or
  `commit`.
- Recurring drafts use `rule.CategoryRef` (or `Unsorted`) directly, not this resolver.
- No learning from import commits yet, and no bulk re-file of history.
- A `field: "note"` rule with `match_kind: "exact"` is refused (`422 invalid_request`): a note is
  prose, so only `contains`/`prefix` make sense there.
- `bucket=month` and `rollup=parent` are separate questions and cannot be asked together.
