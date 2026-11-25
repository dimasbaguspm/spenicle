# F5 — Predictable money arrives on its own

**Status** live · **Client** recurring screen, rule sheet, "make this recurring" action
**Routes** `GET /api/recurring` · `POST /api/recurring` · `PATCH /api/recurring/{ref}` · plus the capture queue it fills (`GET /api/captures`, `PATCH /api/captures/{ref}`)

## 1. The job the user has

"Rent is 2 500 000 on the 1st. Do not make me type it every month — but do not move money
behind my back either." The second half is the invariant: **a due rule queues a capture,
never a ledger entry**. The user still taps approve, and the ledger still only changes
because a person said so.

## 2. Client journeys (multi-hit by design)

### 2.1 Create or promote a rule

```json
POST /api/recurring
{"payee_ref":"<landlord>","account_ref":"<bank>","category_ref":"<rent>",
 "amount_minor":"-2500000","currency":"IDR","cadence":"monthly","interval_n":1,
 "day_of_month":1,"business_day_shift":"prev","next_due_on":"2026-03-01"}
```

`201` with the rule: `ref`, the three refs, `amount_minor`, `cadence`, `interval_n`,
`day_of_month`, `business_day_shift`, `next_due_on`, optional `ends_on`, `origin: "user"`,
`state: "active"`, `created_at`.

`cadence` is `weekly`, `monthly` or `yearly`; `interval_n` is "every N cadences" (`1` is
default, `1–52` on `PATCH`); `day_of_month` (`1–31`) is what keeps a monthly rule on the
1st even across short months; `business_day_shift` (`none`, `next`, `prev`) moves the
materialised date off a weekend without moving the schedule.

"Make this recurring" from an entry is the same call with the entry's payee, account,
category, amount and currency — there is no separate promote route, and the client picks
`next_due_on` (typically the next occurrence after `occurred_on`).

### 2.2 Read and steer

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/recurring` | soonest due first; `state`, `cadence`, `query` (payee name), `refs` filters |
| 2 | `PATCH /api/recurring/{ref}` `{"state":"paused"}` | pause without losing the schedule |
| 3 | `PATCH /api/recurring/{ref}` `{"amount_minor":"-2750000"}` | the rent went up: correct the rule, not the history |
| 4 | `PATCH /api/recurring/{ref}` `{"next_due_on":"2026-04-01"}` | push one occurrence |
| 5 | `PATCH /api/recurring/{ref}` `{"state":"ended"}` | the subscription is over |

`state` moves freely among `suggested`, `active`, `paused` and `ended` — there is no
transition table here, so `ended → active` is accepted. `origin` is `user` or `detected`;
`detected` is reserved for the promotion path a capture will provide.

Payee, account and category are **immutable** on an existing rule: a rule that moved to a
different account is a new rule.

### 2.3 What the user sees next (the two-step that makes it safe)

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/captures?status=pending` | the due rule appears as `kind: "recurring"` |
| 2 | read `draft_json` | `{recurring_rule_ref, payee_ref, account_ref, category_ref, amount_minor, currency, due_on}` — unsealed by the server, ready to pre-fill the approve form |
| 3 | `PATCH /api/captures/{ref}` `{"action":"approve","occurred_on":"2026-03-01","currency":"IDR","postings":[…]}` | posts the entry with `recurring_rule_id` set |
| 4 | (optional) `{"action":"reject","reason":"paid by card"}` | this month's bill is skipped, the rule keeps running |

A double tap on approve cannot double-post: the ledger carries a unique index on
`(recurring_rule_id, occurred_on)`, and the capture is `409 capture_resolved` on the
second tap anyway.

## 3. Backend, end to end

```
POST /api/recurring     Handler.Recurring.Create → Repository.Sqlite.CreateRecurring
                        (resolve payee/account refs → 404, insert origin=user, state=active, audit create)
GET  /api/recurring     Handler.Recurring.List   → ListRecurring (joins payees + accounts, ORDER BY next_due_on, id)
PATCH/api/recurring/{r} Handler.Recurring.Patch  → RecurringByRef → UpdateRecurring (audit update)

Worker.Recurring.Run    every WorkerInterval (1h):
  DueRecurring(now in APP_TIMEZONE, limit 100)
  per rule: for up to catchUpCap (60) occurrences while due <= today and not past ends_on
      → Module.Captures.Enqueue(draft)  dedupe_key = sha256(rule|due)
      → AdvanceRecurring(ref, from=due, to=next, now)   compare-and-swap, audit advance
  then: reclaim artifacts · drop import drafts/uploads · claim+sweep exports · poll mailbox
  record heartbeat (settings.worker_last_run_at) last, with the completion time
```

- **The worker holds no ledger contract.** `captures.Enqueue` writes a `captures` row with
  `kind='recurring'`, `status='pending'` and a sealed draft. Nothing in `cmd/worker`
  imports the ledger. That is invariant 6, and it is why an unapproved rule can never
  inflate the numbers.
- **Idempotency twice.** The capture's `dedupe_key` (`sha256(rule|due)`) stops a second
  queue row for the same occurrence; the ledger's `(recurring_rule_id, occurred_on)`
  unique index stops a second post if the capture somehow survives twice.
- **Advance is a compare-and-swap.** `AdvanceRecurring` only moves `next_due_on` when the
  stored value still equals the occurrence it just queued; a second worker (or a stale
  row) loses the swap and skips. With one container that guard is cheap insurance; with a
  restart mid-run it is the difference between one capture and two.
- **Dates are local.** "Today", the due comparison and the business-day shift all run in
  `APP_TIMEZONE` (from the sealed settings row), never in UTC, so a rule due on the 1st
  is due on the 1st where the user lives.
- **Audit** rows: `recurring_rule/create`, `recurring_rule/update` and
  `recurring_rule/advance` (the worker's move, `actor_kind = "worker"`).

## 4. RRR

### Requirements

1. A rule never posts. Only an approval does, on a capture the rule queued.
2. One occurrence queues at most one capture, and one occurrence posts at most one entry —
   both enforced by unique keys, not by client behaviour.
3. `next_due_on` only moves forward, and only after the occurrence it names was queued
   (compare-and-swap on the stored value).
4. A rule past `ends_on` queues nothing more, and the states `paused`/`ended` stop
   generation without deleting history.
5. Every due occurrence in the backlog is eventually queued: the catch-up cap (60 per rule
   per run) spreads a large backlog over runs instead of dropping it.
6. All calendar decisions use `APP_TIMEZONE`, the same calendar the client reads.
7. The client can always tell why nothing arrived: `/healthz` carries
   `worker_last_run_at`, and a rule's `next_due_on` is visible in `GET /api/recurring`.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| the worker process is not running | nothing is ever queued and the user blames the app ("my rent never showed up") | `worker_last_run_at` is empty or stale on `/healthz`; it is stamped only after a whole run finishes, so it never claims a tick that failed halfway. runit supervises both services in the image, so this is an operator error, not a code path |
| up to one hour of latency | a bill due at 00:01 appears at the next tick | acceptable and stated: the queue is a review queue, not an alarm clock. A client must not promise "at midnight" |
| rule points at an archived account or a category that no longer exists | `enqueue` fails every run; the rule never produces anything and the log carries the error | the rules screen should show the referenced names (it does: `account_ref`, `category_ref` plus the joined names) and refuse to archive an account that has active rules |
| `Unsorted` missing | a rule without `category_ref` falls back to `Unsorted` by name and fails with `404 not_found` | same guard as [F4](./04-accounts-and-payees.md): do not archive or rename `Unsorted` |
| a long-paused rule floods the queue | 5 years of a monthly rule is 60 captures in one run, then more next run | the cap is deliberate; the review screen should sort by `due_on` and offer reject-per-row, which is exactly what it already does |
| approve requires postings | the draft is a suggestion, not a valid entry | the client must build the postings from `draft_json`; a raw `{"action":"approve"}` without postings is `422 invalid_request` |

### Rollout

1. **Rules read-only first** (`GET /api/recurring`): shows what is scheduled without
   touching generation.
2. **Create rules second**, with `next_due_on` defaulted to the next occurrence and a
   visible "this will appear in your review queue, not in your ledger" line.
3. **Ship the queue item last** (it is [F2](./02-capture-inbox.md)'s screen): the
   recurring draft only becomes useful once approve exists.
4. Rollback: `PATCH {"state":"paused"}` on every rule. Queued captures can be rejected;
   posted entries are voided in the ledger.

## 5. Acceptance criteria

```gherkin
Scenario: A rule is a plan, not a posting
  When I send a POST to "/api/recurring" with:
    """json
    {"payee_ref":"{{payee:Landlord}}","account_ref":"{{account:Cash}}",
     "amount_minor":"-2500000","currency":"IDR","cadence":"monthly",
     "day_of_month":1,"next_due_on":"2026-03-01"}
    """
  Then the response status is 201
  And the response body has state "active"
  And the response body has origin "user"
  And the store holds 0 "ledger_entries" rows

Scenario: A due rule queues exactly one capture
  Given a rule due on "2026-03-01"
  And the clock is "2026-03-01"
  When the worker runs
  Then the store holds 1 "captures" row of kind "recurring"
  And the store holds 0 "ledger_entries" rows
  When the worker runs again
  Then the store still holds 1 "captures" row of kind "recurring"

Scenario: The catch-up cap spreads a backlog instead of dropping it
  Given a monthly rule due on "2020-01-01"
  And the clock is "2026-01-01"
  When the worker runs
  Then the store holds 60 "captures" rows of kind "recurring"
  And the rule's next_due_on is "2025-01-01"
  When the worker runs again
  Then the rule's next_due_on moves closer to "2026-01-01"

Scenario: Approving a recurring capture posts it with the rule attached
  Given a queued recurring capture for "2026-03-01"
  When I approve it with the draft's postings
  Then the response status is 201
  And the entry carries recurring_rule_id
  And a second approve of the same capture is 409 "capture_resolved"

Scenario: A paused rule stops generating
  Given an active rule due on "2026-03-01"
  When I send a PATCH to "/api/recurring/{{ref}}" with:
    """json
    {"state":"paused"}
    """
  And the worker runs on "2026-03-01"
  Then the store holds 0 "captures" rows of kind "recurring"

Scenario: Steering a rule writes the journal
  Given a rule "Rent"
  When I send a PATCH to "/api/recurring/{{ref}}" with:
    """json
    {"amount_minor":"-2750000","next_due_on":"2026-04-01"}
    """
  Then the response status is 200
  And the journal holds 1 "recurring_rule" row with action "update"
```

## 6. What this page does not promise

- No automatic posting and no "skip approval" toggle — by invariant, not by omission.
- No edit of payee, account or category on an existing rule.
- No transition guard on `state`, no `suggested`/`detected` generation yet.
- No notification, no push: the queue is pulled, not pushed.
