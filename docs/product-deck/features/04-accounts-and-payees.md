# F4 — Accounts, categories and merchants

**Status** live · **Client** chart of accounts, account sheet, payee picker, payee sheet
**Routes** `GET /api/accounts` · `POST /api/accounts` · `PATCH /api/accounts/{ref}` · `GET /api/payees` · `POST /api/payees` · `PATCH /api/payees/{ref}`

## 1. The job the user has

"Tell the ledger where money lives and who it went to." Accounts are the where (cash,
a bank, a card), categories are the why (groceries, rent) and payees are the who (the
merchant, the landlord). All three are the same primitive in the backend: **a category is
an account whose kind is `expense` or `income`**, while the chart also carries `asset`,
`liability` and setup-created `equity` accounts.

Two things the user must be able to do from day one: rename/archive something they got
wrong, and pre-fill the next entry from a payee's defaults.

## 2. Client journeys (multi-hit by design)

### 2.1 First look

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/meta` | settings + every account with `base_amount_minor` + the ISO currency list — enough for the first paint |
| 2 | `GET /api/payees` | the picker; includes archived rows **flagged**, so the client decides to hide them |
| 3 | `GET /api/accounts?kind=expense` | the category picker |

The seed is `Cash` (asset) and `Unsorted` (expense), written by `EnsureBaseline` at
the first boot. `Unsorted` is the fallback a capture approval and an import commit use
when the user has not chosen a category, so it must never be archived: nothing in the
API forbids it, and the consequence is a `404 not_found` on the next commit.

### 2.2 Create an account or a category

```json
POST /api/accounts
{"name":"Groceries","kind":"expense","currency":"IDR"}
```

`201` with `{ref, name, kind, currency, archived:false}`. `currency` is optional and
defaults to the base currency; `kind` is one of `asset`, `liability`, `equity`,
`expense`, `income`. **No ledger entry is written** — an account with a zero balance is
a normal state. Opening balances belong to `POST /api/setup`.

### 2.3 Change what it says about itself

```json
PATCH /api/accounts/{ref}
{"name":"Groceries & home","icon":"cart","archived":false}
```

`200` with the account. An empty body is accepted and changes nothing (the row is
rewritten as it is). `archived: true` stamps `archived_at`; every historical posting keeps
pointing at the account, and the balance stays visible wherever the client does not filter
archived rows out.

What cannot change: `kind` (it would break the double-entry references) and `parent`
(moving an account under another rewrites the meaning of past balances). Archive and
create instead.

### 2.4 A payee with defaults

```json
POST /api/payees
{"name":"Kopi Kenangan","default_account_ref":"<Cash>","default_category_ref":"<Unsorted>"}
```

`201` with `{ref, name, default_account_ref, default_category_ref, archived, created_at}`.
The two defaults are what make the second coffee a two-tap entry: the form reads them off
the picker row and pre-fills both legs. `PATCH /api/payees/{ref}` renames, re-points the
defaults, or archives; `""` is not accepted for a default here (omit the field instead).

`GET /api/payees` filters: `archived` (`true`/`false`/absent), `query` (substring of the
name, case-insensitive), `refs`, `cursor`, `limit`. `GET /api/accounts` filters: `kind`,
`currency`, `parent_ref`, `archived`, `query`, `refs`, `cursor`, `limit`, ordered
`kind, name`.

## 3. Backend, end to end

```
GET  /api/accounts   Handler.Accounts.List → ListAccounts (paged, filtered)
                     + BalancesByAccount (SUM(base_amount_minor) GROUP BY account)
POST /api/accounts   Handler.Accounts.Create → Repository.Sqlite.CreateAccount (ref = uuidv7)
PATCH/api/accounts   Handler.Accounts.Patch  → AccountByRef → UpdateAccount → audit update
GET  /api/payees     Handler.Payees.List    → ListPayees (LEFT JOIN accounts twice)
POST /api/payees     Handler.Payees.Create  → resolve default refs → CreatePayee
PATCH/api/payees     Handler.Payees.Patch   → PayeeByRef → UpdatePayee → audit update
```

- **No stored balance.** `base_amount_minor` is `SUM(base_amount_minor)` over
  `ledger_postings` per account; a void excludes itself automatically because its
  reversal negates it. There is no column to drift and nothing to recompute after a
  correction.
- **A category is not a table.** `expense` and `income` accounts are the categories; the
  chart is one collection with one shape, so a picker never needs two code paths.
- **`UNIQUE (name, kind)`** is the identity of an account. `payees.name` is unique on its
  own. Both are database constraints, and today a duplicate answers `500 internal_error`
  rather than a friendly `409` — the client must not rely on a name being free.
- **Defaults are resolved before the insert.** `POST /api/payees` turns
  `default_account_ref`/`default_category_ref` into ids first, so an unknown ref is
  `422 unknown_reference` and never a dangling foreign key.
- **Every write appends its audit row** in the same transaction: `account/update`,
  `payee/update`, with `from_json`/`to_json` carrying what moved.

## 4. RRR

### Requirements

1. An account is identified by `ref`; `name` + `kind` is unique, and a duplicate never
   silently merges.
2. Creating an account never writes a ledger entry. A balance is a consequence of
   postings, never of account creation.
3. Archiving hides from pickers but changes no historical number: the balance sum keeps
   including archived accounts unless the client filters them out.
4. `kind` and `parent` are immutable through the API.
5. A payee's defaults are optional and individually clearable by omission on
   `POST /api/payees`; an unknown default ref is refused before anything is written.
6. Archived payees stay listed (flagged) by default, so a client can show "archived
   merchants" without a second endpoint.
7. The two seed accounts exist after every boot, and `GET /api/accounts` proves it.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| `Unsorted` archived or renamed by the user | capture approve and import commit fall back to it by name (`constant.SeedExpenseAccount`) and then answer `404 not_found` | the client should refuse to archive `Unsorted` and say why; the backend keeps it findable by name, so a rename is worse than an archive |
| duplicate `name`+`kind` → `500` | the user sees "internal error" for a typo | validate client-side (case-insensitive compare against the loaded list) and treat `500` as "that name is taken, pick another" |
| per-pair balances are base-only | a USD account reports IDR, which reads wrong on an account screen | label the column "in <base currency>"; the native amount lives on the postings, not on the account |
| `parent_ref` is filterable but unreachable | a client might build a tree from a field no route sets | do not ship category hierarchy: `parent_id` exists in the schema and nothing writes it (see [F9](./09-gaps-and-next.md)) |
| archiving used as deleting | the payee still appears in history and in filters | the UI vocabulary is "archive", with the sentence "history keeps it" |
| no merge of two payees | a duplicate merchant accumulates history under two refs | one of them is archived; entries are re-pointed one at a time through `PATCH /api/entries/{ref}` |

### Rollout

1. **Ship read-only accounts and payees first** (`GET /api/accounts`, `GET /api/payees`):
   the entry form needs them and nothing can break.
2. **Then create**, with the five `kind` values spelled out in the sheet: `asset`
   (wallet, bank), `liability` (card, loan), `equity`, `expense` and `income` (categories).
3. **Then patch** (rename, icon, archive) — it is the feature that keeps the chart clean
   without a delete button.
4. Rollback: none needed. Archiving is reversible (`archived:false`) and no route here
   touches a posting.

## 5. Acceptance criteria

```gherkin
Scenario: The seed accounts exist on a fresh instance
  Given a running API
  When I send a GET to "/api/accounts"
  Then the response carries "Cash" as an "asset" account
  And the response carries "Unsorted" as an "expense" account

Scenario: A category is created as an expense account with a zero balance
  When I send a POST to "/api/accounts" with:
    """json
    {"name":"Groceries","kind":"expense","currency":"IDR"}
    """
  Then the response status is 201
  And the response body has kind "expense"
  And the response body has base_amount_minor "0"
  And the store holds 0 "ledger_entries" rows

Scenario: A balance is derived from postings
  Given an entry posting "-18000" to "Cash"
  When I send a GET to "/api/accounts?refs={{account:Cash}}"
  Then the account "Cash" carries base_amount_minor "-18000"

Scenario: An unknown kind is refused
  When I send a POST to "/api/accounts" with:
    """json
    {"name":"Crypto","kind":"wallet"}
    """
  Then the response status is 422
  And the error code is "invalid_request"

Scenario: Archiving keeps every posting
  Given an entry posting to "Groceries"
  When I send a PATCH to "/api/accounts/{{ref}}" with:
    """json
    {"archived":true}
    """
  Then the response status is 200
  And the response body has archived true
  And the entry still carries the posting to "Groceries"

Scenario: An account's kind cannot change
  Given an account "Groceries" of kind "expense"
  When I send a PATCH to "/api/accounts/{{ref}}" with:
    """json
    {"kind":"asset"}
    """
  Then the response status is 400
  And the error code is "invalid_json"

Scenario: A payee carries its defaults into the form
  When I send a POST to "/api/payees" with:
    """json
    {"name":"Kopi","default_account_ref":"{{account:Cash}}",
     "default_category_ref":"{{account:Unsorted}}"}
    """
  Then the response status is 201
  And the response body carries both default refs
  When I send a GET to "/api/payees?query=kopi"
  Then the listing carries "Kopi" with the same two defaults

Scenario: A default pointing at nothing is refused
  When I send a POST to "/api/payees" with a default_account_ref of "{{ref}}"
  Then the response status is 422
  And the error code is "unknown_reference"
```

## 6. What this page does not promise

- No delete: archive only, for accounts and payees.
- No merge, no rename-everywhere, no `kind` change, no reparenting.
- No icon catalogue: `icon` is an opaque string up to 32 characters the client interprets.
- No per-pair (native currency) balance on an account.
- A `default_category_ref` must name an `expense`/`income` account; an asset there answers `422 invalid_request`.
