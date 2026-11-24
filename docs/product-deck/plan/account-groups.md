# Plan — account groups

**Question** "Show me all my liquid money — wallet plus two banks — not three balances I
add in my head." **State** decisions open (taxonomy vs. tags). **Blocks** nothing.

## 1. The job

A **group** is a named collection of accounts for reading: *Liquid*, *Cards*, *Investments*,
*Household*. It answers "how much money can I actually reach", which no single account and
no category answers today.

The trap: the schema already has a tree — `accounts.parent_id` — and we just shipped it
(`feat: nest a category under a parent and roll it up`). Two overlapping hierarchies is how
a chart of accounts becomes unusable. So the plan starts with a **separation of duties**:

| concept | scope | shape | who reads it |
| --- | --- | --- | --- |
| **parent** (shipped) | categories (`expense`/`income`) only | one parent, three levels, no cycles | reporting roll-up, budget |
| **group** (this plan) | assets and liabilities | many-to-many, flat | home screen, pickers, filters |

A rule that follows: **an account may be in any number of groups, but its `kind` decides
which concept applies.** Categories never appear in a group; assets and liabilities never
get a parent.

## 2. Options considered

| option | how it works | verdict |
| --- | --- | --- |
| **A. two tables** (`account_groups`, `account_group_members`) | explicit membership, refs, audited | **leaning yes** |
| **B. reuse `parent_id`** | one parent per asset, pick the asset instead of the group | rejected: one parent is a tree, not "all cards"; and it collides with the category tree we just shipped |
| **C. a `group` text column** | free text, grouped at read time | rejected: typos create groups, no rename, no audit, no ref to filter by |
| **D. saved filters** | a `custom_queries` row with `account_ref[]` | rejected as the primary model: membership becomes UI state, and a filter cannot carry a name, an icon or a balance |
| **E. groups of groups** | nesting | rejected for v1: flat covers *Liquid*/*Cards*; nesting is the tree we already have elsewhere |

## 3. Data sketch (two tables)

```
account_groups
  id          INTEGER PK
  ref         TEXT NOT NULL UNIQUE      -- 32 hex
  name        TEXT NOT NULL UNIQUE      -- "Liquid", "Cards"
  icon        TEXT NULL                 -- opaque, ≤ 32, like accounts.icon
  sort_order  INTEGER NOT NULL DEFAULT 0
  archived_at TEXT NULL                 -- never deleted
  created_at  TEXT NOT NULL

account_group_members
  group_id   INTEGER NOT NULL REFERENCES account_groups(id)
  account_id INTEGER NOT NULL REFERENCES accounts(id)
  added_at   TEXT NOT NULL
  PRIMARY KEY (group_id, account_id)
```

Both writes append one `audit_log` row (`account_group/create|update`), in the same
transaction, like every other journaled table.

## 4. API sketch

| method | route | body / query | answers |
| --- | --- | --- | --- |
| `GET` | `/api/account-groups` | `?include_archived` | every group with `balance_minor`, `account_count`, `account_refs` |
| `GET` | `/api/account-groups/{ref}` | — | one group, its members (each with `base_amount_minor`) and the summed `balance_minor` |
| `POST` | `/api/account-groups` | `{name, icon?, account_refs[]}` | `201`, `409 duplicate` on a taken name |
| `PATCH` | `/api/account-groups/{ref}` | `{name?, icon?, archived?, account_refs?}` | the group, membership replaced **absolutely** (a set, not a diff) |
| `GET` | `/api/accounts` | `?group_ref=…` (new filter) | the members, so a picker can filter by group |

Membership is a set on purpose: re-sending the same body is a no-op, which is the same
rule `PATCH /api/imports/{ref}/rows/{index}` follows.

## 5. Semantics

- **Balance** is `SUM(base_amount_minor)` over the group's postings — the same aggregate
  `GET /api/accounts` already uses, summed per group. Never stored.
- **A group cannot change the ledger.** No entry, no approval, no import commit reads a
  group. It is a lens, and the only writes are membership.
- **Kind guard**: a member must be `asset` or `liability` (`422 invalid_request`
  otherwise). Adding an `expense` category is the mistake this rule exists to prevent.
- **Archiving a group** hides it from pickers and the home screen; members keep their
  postings, and `GET /api/account-groups/{ref}` still answers (history).
- **Archiving an account** leaves it in the group; the aggregate simply stops moving. The
  response flags `archived: true` per member.

## 6. RRR

**Requirements**

1. A group is readable by `ref`, renameable, and never deletable.
2. Membership is absolute and idempotent; one transaction per change, one audit row.
3. `balance_minor` is derived from postings and excluded voids, like every other balance.
4. Only `asset`/`liability` accounts may join a group.
5. No group appears in `POST /api/entries`, `PATCH /api/entries`, capture approval or
   import commit — the lens never becomes a posting target.

**Risks**

| risk | why it hurts | mitigation |
| --- | --- | --- |
| two hierarchies confuse the user | "is my bank a parent or a group?" | the picker shows groups only for assets/liabilities, the category screen shows the tree only for expenses; the deck says it in one line |
| a group becomes a second budget | "Liquid" with a target turns into an envelope | budgets live on categories ([plan](./budget.md)); the group response carries no target field |
| membership churn is unaudited | "who moved my card out of Cards?" | one audit row per PATCH, with `from`/`to` membership refs |
| a group hides an account | totals look smaller than the account list | the group response lists every member with its balance; nothing is implicit |

**Rollout**

1. `GET /api/account-groups` + `POST` — the read and the name.
2. `PATCH` membership (the only subtle write).
3. The home screen's "Liquid" tile last, once two groups exist in the client.

## 7. Open questions

1. **Do groups need a `kind`?** A group of liabilities ("Cards") is useful, but so is a
   mixed "Everything". *(leaning: no `kind` on the group; the members carry theirs, and the
   response splits `assets_minor` / `liabilities_minor`.)*
2. **Sort order** — manual (`sort_order`) or alphabetical? *(leaning: manual, because
   "Liquid" belongs first.)*
3. **Default group** — should the first boot seed one (`Cash` inside `Liquid`)? *(leaning:
   no; an empty list is honest.)*
4. **Does a group need its own analytics namespace?** (`GET /api/analytics/groups`). Not in
   v1: the balance and the member list cover the home screen.

## 8. Exit criteria (promote to `../features/`)

- [ ] questions 1–3 answered here
- [ ] two tables in a migration, `docs/v2-api.md` updated
- [ ] five routes with endpoint pages, `?group_ref=` on `GET /api/accounts`
- [ ] UAT: create with members, rename, absolute membership patch, kind guard, archived group
      still readable, balance equals the sum of members
- [ ] no ledger path reads a group (a grep in the test or a comment in the design doc)
