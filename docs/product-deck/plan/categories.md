# Plan — categories, detected consistently

**Question** "`KOPI KENANGAN` should land in *Personal food* every time. `WHISKAS` should
land in *Cat*. `INDOMARET` should land in *Grocery*, not in *Personal food*." **State**
phase 1 is ready to build (no schema change). **Blocks** the budget feature, which is
useless while `Unsorted` holds half the ledger.

## 1. The real problem

It is **not** "we need AI". It is **consistency**: the same merchant must produce the same
category, and today it does not, because the only mechanism is a human remembering to pick
the right category on every capture, entry and imported row.

What exists today:

- `payees.default_category_ref` — a manual default, set on the payee sheet, prefilling the
  entry form; it is per payee, and nothing learns it.
- a capture `draft_json` (sealed) with whatever the extractor guessed, and an approve body
  that must carry the postings — the client resolves the category.
- import rows, which carry a `category_ref` the user patches one row at a time.

Nothing shares a decision. Three screens, three guesses. **One resolver, used everywhere,
is the feature.**

## 2. Options considered

| option | how it works | verdict |
| --- | --- | --- |
| **A. learn on approve** | when the user approves a capture (or commits a row) for a payee that has no default, store that category as the payee's default; ask once ("always use this for KOPI KENANGAN?"). | **yes, phase 1** — no schema change, immediate consistency |
| **B. deterministic rules** | a `categorization_rules` table: pattern (exact/contains/prefix) on payee name, note or capture text → category, with priority | **yes, phase 2** — the only way to catch a merchant whose name never repeats ("TAGIHAN BULANAN") |
| **C. vendor / LLM suggestion** | the extraction rail already reads a receipt; it could return a category | suggestion only, behind rule B in priority; never writes the ledger |
| **D. embeddings / fuzzy merchant matching** | nearest-neighbour over past payees | rejected: a new dependency, non-deterministic output, unexplainable to the user |
| **E. hierarchy inheritance** | parent category default flows to children | rejected: we just shipped the tree for reporting; using it for classification makes both harder to reason about |

## 3. One resolver, three screens

A pure function, the same one called from the capture module, the entries handler and the
imports handler:

```
Suggest(kind, payee, text) Suggestion
  Suggestion{AccountRef, Why, RuleRef, Tier}
```

Order — first match wins, and it is not configurable:

1. **Tier `payee_default`** — the payee's `default_category_ref` (phase 1 writes it).
2. **Tier `rule_exact`** — a rule whose pattern equals the payee name, case-folded.
3. **Tier `rule_contains`** — a rule whose pattern is a substring of the payee name, then
   of the note, then of the capture text (first hit, ordered by priority, then by pattern
   length, then by `created_at`).
4. **Tier `vendor`** — the extractor's own guess, when it gave one.
5. **Tier `none`** — `Unsorted`, with `Why: "no match"`.

Tie-breaking is part of the contract: **priority descending → pattern length descending →
`created_at` ascending**. Two rules that both match always resolve the same way, on every
screen and in every test.

The resolver is pure (no ctx, no I/O) except for reading the rule set, which the caller
passes in: that is what makes it table-testable and identical everywhere.

## 4. Where it runs

| touchpoint | what it returns | does it write? |
| --- | --- | --- |
| `POST /api/captures` response, and `GET /api/captures` rows | `suggestion: {account_ref, account_name, why, tier, rule_ref?}` | no |
| `GET /api/payees?query=` | each payee's `default_category_ref` (already there) plus the resolver's `suggestion` when the default is empty | no |
| `PATCH /api/captures/{ref}` `approve` | when the body sends **no** payee default and the capture has a payee, the approved category is stored as the payee's default — unless the body says `{"learn": false}` | yes (payee row, audited) |
| `POST /api/imports` rows | each row carries `suggested_category_ref` next to its clash verdict | no |
| recurring drafts | the draft's `category_ref` already comes from the rule | no |

**Nothing in the ledger is written by a suggestion.** Capture approval and import commit
stay the only write paths, which keeps invariant 6 intact.

## 5. Data sketch (phase 2, the 18th table)

```
categorization_rules
  id          INTEGER PK
  ref         TEXT NOT NULL UNIQUE        -- 32 hex
  pattern     TEXT NOT NULL               -- ≤ 80, trimmed, case-folded on write
  field       TEXT NOT NULL CHECK (field IN ('payee','note','text'))
  match_kind  TEXT NOT NULL CHECK (match_kind IN ('exact','contains','prefix'))
  account_id  INTEGER NOT NULL REFERENCES accounts(id)  -- the category
  priority    INTEGER NOT NULL DEFAULT 0  -- higher wins
  archived_at TEXT NULL
  created_at  TEXT NOT NULL
```

No `regex` in v1: a substring covers the real cases, and a regex column is a foot-gun in a
single-user app (catastrophic backtracking is a support ticket, not a feature). Live caps:
≤ 500 rules, `pattern` 2–80 characters.

Phase 1 needs no column at all: `payees.default_category_ref` already exists.

## 6. API sketch

| method | route | body | answers |
| --- | --- | --- | --- |
| `GET` | `/api/categorization/rules` | `?include_archived`, `?account_ref` | the rules, ordered by `priority DESC, created_at` |
| `POST` | `/api/categorization/rules` | `{pattern, field, match_kind, category_ref, priority?}` | `201`, `409 duplicate` on an identical `(pattern, field, match_kind)` |
| `PATCH` | `/api/categorization/rules/{ref}` | `{pattern?, category_ref?, priority?, archived?}` | the rule |
| `GET` | `/api/categorization/suggest` | `?payee_ref=&text=&kind=expense` | `{account_ref, why, tier, rule_ref?}` — the same resolver, callable by a client that already has the text |

`POST /api/captures` and `PATCH /api/captures/{ref}` grow one **response** field
(`suggestion`) and one **request** flag (`learn`), both additive.

## 7. RRR

**Requirements**

1. The same merchant produces the same suggestion on every screen: one resolver, one
   precedence order, one tie-break, table-tested with golden cases.
2. A suggestion never posts. Only `approve` and `commit` write the ledger.
3. Every suggestion says **why**: `tier` plus the matching `rule_ref` when there is one.
4. Learning (`phase 1`) only fills an **empty** payee default and is audited
   (`payee/update`, `from` → `to`); a body can opt out with `{"learn": false}`.
5. A rule that points at an archived category is skipped, never applied.
6. Nothing is inferred from the amount, the day of the week or the account: a suggestion
   must be explainable in one sentence.

**Risks**

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a wrong default becomes permanent | every future `KOPI` lands in the wrong category | learning happens once per payee, is visible on the payee sheet, and is a `PATCH` away from being fixed |
| two categories fit (`INDOMARET` = grocery vs. personal food) | ambiguity is real, not a resolver bug | the suggestion is always editable, `Why` names the rule, and the import row shows it per row rather than silently |
| a broad pattern swallows everything (`pattern: "A"`) | one rule files half the ledger | minimum pattern length 2, live rule cap, and the resolver returns `rule_ref` so the offender is identifiable |
| archived category in a rule | `404 not_found` on the next commit | the resolver skips it and marks the rule `orphaned: true` in the list |
| multi-language merchants (ID/EN spelling) | no rule fires | a rule per spelling; the phase-1 default is per payee, so one payee can carry both |
| vendor suggestion drifts | a re-run of the extractor changes the guess | `tier: vendor` is the lowest non-`none` tier and the client shows it differently from a rule match |

**Rollout**

1. **Phase 1 — learn on approve.** One behaviour, no schema, no new route: the approve
   path writes an empty payee default from the postings the user chose. Cheapest possible
   consistency, and it is a `fix:`/`feat:` of its own.
2. **Phase 2 — the rules table** plus `GET /api/categorization/suggest`. The resolver is
   already there from phase 1, so this is CRUD and one call site.
3. **Phase 3 — capture and import prefill.** Additive response fields; no client break.
4. **Phase 4 — history, not automation.** A dry-run report ("these 40 entries would change
   under the new rules") that the user applies row by row. Never a bulk rewrite.

## 8. Open questions

1. **Does phase 1 learn on import commits too?** *(leaning: yes, one row at a time, only
   when the row had no category and the user picked one.)*
2. **Should a rule be allowed to name a parent category?** *(leaning: no — the resolver
   answers with a leaf; the tree stays a reporting tool.)*
3. **Do we need `field: 'text'`?** Capture text is the receipts' own words; a rule there is
   powerful and noisy. *(leaning: ship `payee` + `note` in phase 2, add `text` when asked.)*
4. **Confidence** — do we surface `tier` as a number? *(leaning: no numbers; a tier name is
   honest, a fake 0.87 is not.)*

## 9. Exit criteria (promote to `../features/`)

- [ ] phase 1 shipped: approve fills an empty payee default, audited, `learn` flag, UAT
- [ ] resolver is pure and table-tested with the golden cases (`KOPI`, `WHISKAS`,
      `INDOMARET`, an unmatched text)
- [ ] phase 2: table + four routes + endpoint pages + `docs/v2-api.md`
- [ ] capture and import responses carry `suggestion` (additive) and a snapshot proves it
- [ ] the deck's F2/F6 pages say where the suggestion appears, and that it never posts
