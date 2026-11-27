# F3 — The ledger is the truth

**Status** live on core paths · **Client** entry form, ledger list, entry detail, void sheet, rate lookup
**Routes** `POST /api/entries` · `GET /api/entries` · `GET /api/entries/{ref}` · `PATCH /api/entries/{ref}` · `GET /api/rates`

## 1. The job the user has

"I bought groceries. File it." And later: "that coffee was logged twice — undo it without
erasing the fact that it happened." The ledger is double-entry, but the user never sees
two sides: the client fills both legs from a payee's defaults and shows one row.

Three properties the user feels even though nobody says them out loud:

- **every entry is balanced** (native and base sums zero), so a percentage or a chart
  cannot drift;
- **nothing is deleted** — a mistyped entry is voided, which writes its opposite;
- **any date is legal** — backdating never asks permission, and no month is ever closed.

## 2. Client journeys (multi-hit by design)

### 2.1 Post an entry

| # | call | why |
| --- | --- | --- |
| 1 | `GET /api/payees?query=kopi` | the form's autocomplete, with the payee's default account and category |
| 2 | `GET /api/accounts` | the account picker, already carrying `base_amount_minor` |
| 3 | `GET /api/rates?base=EUR&quote=IDR&on=2026-02-14` | only when the entry's currency is not the base one |
| 4 | `POST /api/entries` | the write |

```json
{"client_id":"<uuidv7>","occurred_on":"2026-02-14","currency":"IDR","payee_ref":"<kopi>",
 "note":"coffee",
 "postings":[{"account_ref":"<Cash>","amount_minor":"-18000"},
             {"account_ref":"<Unsorted>","amount_minor":"18000"}]}
```

`201` with the entry, `200` when `client_id` replays one already stored. The response is
the same object the list route returns per row: `ref`, `occurred_on`, `currency`,
`source`, `note`, optional `payee {ref, name}`, and `postings[]` where each posting
carries `account {ref, name, kind}`, `account_ref`, `amount_minor`, `base_amount_minor`,
`fx_rate`, `fx_source`. A client never has to join refs to names after a write.

Signs carry the meaning: money leaving an asset is negative, the expense category is
positive, and the two always sum to zero. `source` defaults to `manual`; a capture
approval derives it from the capture kind (`share` and `image` → `share`, `email`,
`statement`, `recurring`, anything else → `manual`), an import sends `statement`, and a
voided original's reversal is `adjustment`.

### 2.2 Read it

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/entries?from=&to=&limit=50` | newest first; `meta.has_more` + `meta.next_cursor` |
| 2 | `GET /api/entries?cursor=<ref>` | the next page; the cursor is an entry ref, never an offset |
| 3 | `GET /api/entries?payee_ref=<ref>` | one merchant's history |
| 4 | `GET /api/entries?amount_min=18000&amount_max=18000` | the "which entry was this SMS about" lookup |
| 5 | `GET /api/entries?query=coffee` | substring of the note, or of the payee name |
| 6 | `GET /api/entries/{ref}` | a deep link; the same object without the envelope |

Filters, all optional: `from`, `to`, `account_ref` (list), `payee_ref` (list), `source`
(list), `currency`, `query`, `refs` (list), `voided`, `amount_min`, `amount_max`,
`cursor`, `limit`. `amount_min`/`amount_max` compare `ABS(base_amount_minor)`, so the
bounds are base-currency and an income of 18 000 matches the same window as a spend.

### 2.3 Correct it — three actions, one at a time

| intent | call | result |
| --- | --- | --- |
| the merchant was wrong | `PATCH /api/entries/{ref}` `{"payee_ref":"<ref>"}` | `200`, the same entry now carrying the new payee; `""` clears it |
| it should never have counted | `PATCH /api/entries/{ref}` `{"void":true,"reason":"duplicate"}` | `200` the **reversal** entry; the original carries `voided_at` |
| anything else (amount, date, note) | `PATCH /api/entries/{ref}` `{"occurred_on":"2026-02-15","note":"coffee and a bun"}` or `postings` | `200` the **replacement** entry (source `adjustment`); the original carries `voided_at` |

`{"void":false}` is `422 unsupported_patch`. Each action travels alone: a body with a void
and anything else is `422 invalid_request`, and so is a body mixing `payee_ref` with a
correction. A second void is `409 invalid_state`.

The reversal is a real entry: negated postings, `reverses_entry_id`, `source:
"adjustment"`. Every derived number (balance, dashboard, month spend, category pie)
excludes both the voided entry and its reversal, which is why a corrected ledger reads as
if the mistake never happened while the rows still prove it did.

## 3. Backend, end to end

```
POST /api/entries      Handler.Entries.Post → Module.Ledger.Post
                       → idempotency lookup (client_id) → PayeeSource.PayeeByRef
                       → Settings.BaseCurrency → per-posting FX (big.Rat, one rounding)
                       → entity.NewEntry → entity.CheckZeroSum (native + base)
                       → Repository.Sqlite.InsertEntry (entry + postings + audit, one TX)
                       → CheckZeroSum again inside the TX
GET  /api/entries      Handler.Entries.List → Module.Ledger.List → ListEntries (+ per-entry postings)
GET  /api/entries/{r}  Handler.Entries.Get  → Module.Ledger.Get → EntryByRef + postingsByEntryID
PATCH/api/entries/{r}  Handler.Entries.Patch → Module.Ledger.Void → VoidEntry
                       (UPDATE voided_at WHERE NULL, INSERT reversal + negated postings + audit, one TX)
                       → Module.Ledger.UpdatePayee → UpdateEntryPayee + audit
                       → Module.Ledger.Correct → void + replacement, one TX
GET  /api/rates        Handler.Rates.Get    → rates.Contract.Rate (memory → fx_rates on a miss)
```

- **Two zero-sum checks.** `entity.NewEntry` proves the entry is balanced before the
  store is called, and `InsertEntry` proves it again inside the write transaction — the
  second one is the guard that matters, because only it runs under the same lock as the
  insert.
- **Money is integers end to end.** `amount_minor` and `base_amount_minor` are signed
  int64s; `fx_rate` is exact decimal `TEXT` handled with `math/big.Rat`; the conversion
  from native to base rounds **once**, half away from zero. A split conversion's rounding
  residual is assigned once to the largest posting so both sums stay zero; a result
  outside checked int64 (including the floor, which cannot be negated) is refused. There
  is no `float64` on the path, and `fx_source` records which of
  `ecb|cached|manual|identity` produced the rate.
- **The base currency comes from settings, per request.** A posting in the base currency
  gets `fx_rate: "1"` and `fx_source: "identity"`; anything else takes an explicit rate or
  resolves from `fx_rates` through exact day, nearest earlier business day, then a EUR
  cross rate. The stored posting carries the rate, the day used and `ecb|cached|manual|identity`.
- **Voiding is a write, not an undo.** The store builds and zero-sum-checks the full
  reversal before opening the write transaction, then updates the original's `voided_at`
  with `WHERE voided_at IS NULL` (that predicate is the concurrency guard: the loser gets
  `409`), inserts the reversal and its negated postings, and appends the `void` audit row
  — all in one transaction. An unrepresentable original writes nothing.
- **Reads stay dumb.** `ListEntries` is one query for the page plus one for all its
  postings; `with_balance=true` with one `account_ref` adds one windowed sum. The handler
  joins account and payee display names once per request from `ListAccounts`/`ListPayees`,
  so the store is a data adapter and presentation stays in the HTTP layer.

## 4. RRR

### Requirements

1. Both sums — native and base — are zero for every stored entry. Enforced twice, never
   by the client.
2. A replay of a `client_id` returns the stored entry with `200` and writes nothing.
3. Only the payee patch edits a row in place. Amount, date, note and postings are
   corrected by `Module.Ledger.Correct` (void + replacement in one transaction), and the
   reversal is visible.
4. Void is idempotent in effect, not in status: the second attempt is `409 invalid_state`,
   and a voided entry's `voided_at` can never be cleared by an API call.
5. Backdating is always allowed: no month gate, no period lock, no "you cannot edit a
   closed month".
6. Money crosses the wire as minor-unit strings; a foreign entry may omit `fx_rate` and
   let the ledger resolve it. No silent identity fallback: an unresolved rate is
   `invalid_rate`.
7. Every read is derived from postings. No stored balance, no stored total, no cache
   invalidation to get wrong.
8. The audit row for a void names the entry, the action and the actor (a user, or the
   token's `actor_ref`).

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a client sends a wrong `fx_rate` | the base amount is wrong forever, and every report inherits it | an explicit rate still wins and is stored per posting with `fx_rate`/`fx_source`; `fx_rate_date` is request-only. Omit an explicit rate to let the ledger resolve from the sheet day and read `fx_source` from the response |
| a day has no ECB sheet | `?on=today` misses on weekends and holidays | the ledger and `GET /api/rates` walk back to the nearest earlier business day, then cross through EUR; a miss is `invalid_rate`, never an identity fallback |
| voiding does not touch the capture that produced the entry | the review queue shows `approved` for an entry that no longer counts | void is the ledger's verb; the capture keeps `resolved_entry_id` as evidence. The UI must read the entry, not the capture, when it says "this receipt was filed" |
| voiding a recurring-posted entry | the rule already advanced, so that due date is not re-queued | correct answer for the user: the month is genuinely skipped, and reversing it is a new manual entry |
| an entry can be voided but never deleted | someone who wants the row gone will not get it | state the vocabulary in the UI ("void", never "delete"), and show the reversal in the list with `source: adjustment` |
| `voided` filter is optional | a client that forgets it shows reversed and reversal side by side, doubling the apparent spend | default screens to `voided=false`; keep the "show voided" toggle explicit |
| posting reads are N+1 | one page of 200 entries is 201 queries | acceptable at one user's volume; page size 50 is the default. Do not raise `limit` to 200 in a list that also renders postings |

### Rollout

1. **Post + list first.** Those two make the product usable with no other feature: a
   manual ledger with a correct balance.
2. **Void second, payee patch third.** Both are single-field PATCH bodies; ship them
   behind a long-press on the row, not as a separate screen.
3. **FX last**, and only with the manual-rate field on screen. An entry in a foreign
   currency without a rate is a `422`, so a client that ships FX without the field ships
   a broken form.
4. Rollback: nothing here migrates. A client can hide the FX field and keep posting
   base-currency entries.

## 5. Acceptance criteria

```gherkin
Scenario: A balanced entry is posted and returned with its display names
  When I send a POST to "/api/entries" with:
    """json
    {"occurred_on":"2026-02-14","currency":"IDR","note":"coffee",
     "postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},
                 {"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
    """
  Then the response status is 201
  And the response JSON matches the snapshot "entry_created"
  And each posting carries its account name and kind

Scenario: An unbalanced entry is refused by name
  When I send a POST to "/api/entries" with postings that do not sum to zero
  Then the response status is 422
  And the error code is "postings_not_balanced"
  And the store holds 0 "ledger_entries" rows

Scenario: A replayed client_id returns the stored entry
  Given an entry posted with client_id "e-1"
  When I send the same POST to "/api/entries" again
  Then the response status is 200
  And the response body has the same ref
  And the store holds 1 "ledger_entries" row

Scenario: A foreign entry without a rate is refused
  When I send a POST to "/api/entries" with currency "USD" and no fx_rate
  Then the response status is 422
  And the error code is "invalid_rate"

Scenario: A foreign entry derives its base amount
  When I send a POST to "/api/entries" with currency "USD" and fx_rate "16000"
  Then the response status is 201
  And each posting carries a base_amount_minor sixteen thousand times its amount
  And fx_source is "manual"

Scenario: Voiding writes a reversal and keeps the original
  Given an entry "coffee"
  When I send a PATCH to "/api/entries/{{ref}}" with:
    """json
    {"void":true,"reason":"duplicate"}
    """
  Then the response status is 200
  And the reversal is a new entry with its own ref, while the original carries voided_at
  And the original carries voided_at
  And the journal holds 1 "ledger_entry" row with action "void"
  And the account balances are unchanged

Scenario: A second void is refused
  Given a voided entry "coffee"
  When I send the same void again
  Then the response status is 409
  And the error code is "invalid_state"

Scenario: The payee is patched; a correction replaces
  Given an entry "coffee"
  When I send a PATCH to "/api/entries/{{ref}}" with:
    """json
    {"payee_ref":"{{payee:Kopi}}"}
    """
  Then the response status is 200
  And the entry carries the payee name "Kopi"
  When I send a PATCH to "/api/entries/{{ref}}" with:
    """json
    {"occurred_on":"2026-02-15","note":"coffee and a bun",
     "postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},
                 {"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
    """
  Then the response status is 200
  And the replacement carries source "adjustment"
  And the original carries voided_at
```

## 6. What this page does not promise

- No running balance unless `with_balance=true` and exactly one `account_ref` are sent.
- No sort order other than newest first, no filter on an entry's own currency amount.
- No in-place edit of the amount, date or postings: a correction voids the original and
  posts a replacement in one write. Only the payee patch mutates the original entry.
- No guessed FX: an explicit `fx_rate` wins; without one the ledger resolves from ECB data
  or refuses with `invalid_rate`.
- No hidden rate: `fx_rate_date` is request-only; every foreign posting in a response carries `fx_rate` and `fx_source`.
