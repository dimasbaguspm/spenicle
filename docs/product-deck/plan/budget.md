# Plan — budget

**Question** "I set Rp 1 500 000 for food this month. How much is left, and am I about to
break it?" **State** decisions open (rollover, period length). **Blocks** nothing; blocked
by categories being stable.

## 1. The job

A budget is a **promise about a category for a window of time**. It is not a new kind of
account, and it is not an entry: money never moves because of a budget. The user gets
three numbers — budgeted, spent, left — and one of them (`left`) is the only thing a home
screen needs to show large.

The pipeline is already there: postings exist, `GET /api/analytics/categories` already
sums a category per range, and the parent roll-up (`?rollup=parent`) already sums children
into a root. Budgets are the first feature that mostly **reads** the ledger.

## 2. Options considered

| option | how it works | verdict |
| --- | --- | --- |
| **A. envelope accounts** | pre-fund an asset account per budget and post against it | rejected: it changes the ledger's meaning, every budget becomes a transfer, and a forgotten transfer corrupts balances |
| **B. a `budgets` table on a category** | one row per category, an amount, a period; usage computed from postings | **leaning yes** — matches the existing derived-numbers rule |
| **C. a JSON blob in `settings`** | `settings['budgets']` | rejected: no `ref`, no audit row per change, no pagination, no validation at the boundary |
| **D. explicit `budget_periods` rows** | the worker materialises a row per month | rejected for v1: a new job that can fail, stale rows, and the same math computed twice |
| **E. tag the entry** | `ledger_entries.budget_ref` | rejected: an entry belongs to one category and possibly several budgets; a tag would double-count on a correction |

## 3. Data sketch (18th table)

```
budgets
  id            INTEGER PK
  ref           TEXT NOT NULL UNIQUE        -- 32 hex, the only wire id
  account_id    INTEGER NOT NULL REFERENCES accounts(id)  -- the category
  amount_minor  INTEGER NOT NULL            -- integer minor units, never money-as-text
  currency      TEXT NOT NULL               -- v1: always the locked base currency
  period        TEXT NOT NULL CHECK (period IN ('weekly','monthly'))
  starts_on     TEXT NOT NULL               -- YYYY-MM-DD, first day of the first window
  ends_on       TEXT NULL                   -- NULL = open-ended
  rollover      INTEGER NOT NULL DEFAULT 0  -- 0/1; see open question 1
  archived_at   TEXT NULL                   -- never deleted
  created_at    TEXT NOT NULL
```

Indexes: `UNIQUE (account_id) WHERE archived_at IS NULL` (one live budget per category —
a second one is a `409 duplicate`), `ix_budgets_account (account_id, starts_on)`.

Why `starts_on` and not `month`: a budget is a **version**. Editing the amount writes a new
row and archives the old one; past windows keep computing against the version that was in
force. That is the only way a dashboard cannot rewrite history.

## 4. API sketch

| method | route | body / query | answers |
| --- | --- | --- | --- |
| `GET` | `/api/budgets` | `?month=YYYY-MM` (default: current month in `APP_TIMEZONE`), `?include_archived` | every live budget with `budgeted_minor`, `spent_minor`, `left_minor`, `pct`, `period_from`, `period_to` |
| `GET` | `/api/budgets/{ref}` | `?months=12` | the same row plus its history per window |
| `POST` | `/api/budgets` | `{account_ref, amount_minor, period, starts_on, ends_on?, rollover?}` | `201`, `409 duplicate` when the category already has one |
| `PATCH` | `/api/budgets/{ref}` | `{amount_minor, archived}` | archives the old version and writes a new one when the amount changes |
| `GET` | `/api/dashboard` | required `?from=YYYY-MM-DD&to=YYYY-MM-DD` | one extra tile: `budget_left_minor`, `budget_pct`, `budget_account_name` |

Wire shapes follow the deck: money as minor-unit strings, `account_ref` in, `ref` out,
`meta {limit, has_more, next_cursor}` on the list.

## 5. Semantics that must be written down before code

- **What counts**: postings whose account `kind` is `expense` (a budget never applies to
  income), summed as `base_amount_minor`, with the voided entry **and** its reversal
  excluded — the same query `CategoryTotals` already runs.
- **Children count**: a budget on a parent sums the subtree (`CategoryTotalsByRoot`). A
  budget on a leaf sums only the leaf. Both are one flag on the query, not two features.
- **Window**: `monthly` = calendar month in `APP_TIMEZONE`; `weekly` = ISO weeks starting
  Monday. No fiscal offset, no custom start day in v1.
- **Before and after**: a window that starts after `starts_on` reports `0` until it
  begins; a window past `ends_on` reports `closed` and is not shown on the dashboard.
- **Spent > budgeted**: negative `left_minor`, `pct > 100`, and the client shows it in the
  danger colour. The API never clamps.
- **Archived category**: the budget keeps reporting (history is history) but is flagged
  `category_archived: true` so the client can say "this category is archived".

## 6. RRR

**Requirements**

1. `spent_minor` is always derived from postings; no stored counter, no materialisation job.
2. A budget change never rewrites a past window: the version in force wins.
3. One live budget per category; a duplicate is `409 duplicate`.
4. An archived budget keeps its history and drops off the dashboard.
5. Money on the wire is minor-unit strings, `account_ref` in, `ref` out.
6. No new process, no new dependency: one table, one migration, routes in `module/budget`.

**Risks**

| risk | why it hurts | mitigation |
| --- | --- | --- |
| budget on `Unsorted` | the catch-all becomes a number nobody trusts | the UI refuses to budget `Unsorted` and says why |
| rollover semantics | a carried deficit silently multiplies next month's budget | v1 ships `rollover: false` only; the flag exists but stays `false` until the open question closes |
| a category renamed mid-month | the budget ref stays valid (it points at the account), so only the label moves | the response carries `account_name` at read time |
| the "left" number becomes a spending licence | a user spends because the app said it was safe | label it "left of budget", never "safe to spend", until income is part of the same number |

**Rollout**

1. `GET /api/budgets` + `POST` (read and create). Nothing else can break.
2. The `PATCH` versioning (archive old, insert new) — the only write with a subtle rule.
3. The dashboard tile last, and only after the list screen exists: a tile with no way to
   edit is a trap.

## 7. Open questions

1. **Rollover** — carry a deficit forward, a surplus forward, or neither? *(leaning:
   neither in v1; the field stays for later.)*
2. **Weekly** — does anyone actually budget per week? If not, cut the enum to `monthly`
   and add it when asked. *(leaning: keep both, the check is one line.)*
3. **Several budgets per category** (e.g. a total and a "coffee only" cap): rejected for
   v1 — the second one is a tag feature, not a budget feature.
4. **Budget vs. income** — "spend no more than 70 % of what I earned" is a *target*, not a
   budget; a different feature (plan it under insights, not here).

## 8. Exit criteria (promote to `../features/`)

- [ ] rollover and period answered above
- [ ] migration written, `budgets` added to `docs/v2-api.md`
- [ ] `GET/POST/PATCH /api/budgets` + dashboard tile with endpoint pages
- [ ] UAT: create, duplicate refusal, spent derives from postings, void disappears, archived
      window stays readable
- [ ] a client can render "budgeted / spent / left" without a second call
