# Plan — categories, detected consistently

**Question** "`KOPI KENANGAN` should land in *Personal food* every time. `WHISKAS` should
land in *Cat*. `INDOMARET` should land in *Grocery*, not in *Personal food*." **State**
**partial** — suggest/rules and approve-learning are live; recurring-draft resolution,
import learning, `field: "note"` with `match_kind: "exact"` and a saved-view `income` kind are not.

## 0. Decision record

Closed on the way in, so nobody re-opens them:

| question | decision |
| --- | --- |
| first-wins or last-wins on a learned default? | **first-wins**: the approve path fills an *empty* `payees.default_category_id` and never overwrites one; changing it is an explicit `PATCH /api/payees/{ref}` |
| which fields can a rule match? | `payee` and `note` exist; note rules accept only `contains`/`prefix` (`exact` is `422 invalid_request`), and payee rules outrank them |
| regex? | no. `exact`, `contains`, `prefix` only — deterministic and explainable |
| who may write the ledger? | nobody new: a suggestion is a read; `approve` and `commit` stay the only writes |

What shipped, in order: `feat: remember the category a capture approval chose` (slice 1),
`feat: map a text pattern to a category and suggest it` (slice 2, consolidated migration
`0001`), and `feat: split category spend per month and report its first day` (slice 3).
"One resolver everywhere" is not shipped: recurring drafts use `rule.CategoryRef` directly
and import commits do not learn. The client-facing contract is [F10](../features/10-categories.md),
also partial.

## 1. The real problem

It is **not** "we need AI". It is **consistency**: the same merchant must produce the same
category, and today it does not, because the only mechanism is a human remembering to pick
the right category on every capture, entry and imported row.

What exists today:

- `payees.default_category_id` — a per-payee default; since `feat: remember the category a
  capture approval chose` an approval fills it when it is empty, first-wins.
- `categorization_rules` — explicit `pattern → category` rules (migration `0001`), applied
  after the payee default.
- a capture `draft_json` (sealed) with whatever the extractor guessed, and an approve body
  that must carry the postings — the client resolves the category. `POST /api/captures`
  carries `suggested_category_ref`; `GET /api/captures` rows do not.
- import rows, which carry per-row `suggested_category_ref` on create and a `category_ref`
  the user patches one row at a time.
- recurring drafts, which take `rule.CategoryRef` or `Unsorted` without calling the resolver.

The suggest route and the capture/import create handlers share one resolver; the entry form,
`GET /api/captures` rows and recurring drafts still bypass it. **One resolver, used
everywhere, is still open.**

## 2. Options considered

| option | how it works | verdict |
| --- | --- | --- |
| **A. learn on approve** | when the user approves a capture (or commits a row) for a payee that has no default, store that category as the payee's default; ask once ("always use this for KOPI KENANGAN?"). | **yes, phase 1** — no schema change, immediate consistency |
| **B. deterministic rules** | a `categorization_rules` table: pattern (exact/contains/prefix) on payee name, note or capture text → category, with priority | **yes, phase 2** — the only way to catch a merchant whose name never repeats ("TAGIHAN BULANAN") |
| **C. vendor / LLM suggestion** | the extraction rail already reads a receipt; it could return a category | not shipped: `config.SelectRail` builds SnapToJSON only and the resolver has no `vendor` tier |
| **D. embeddings / fuzzy merchant matching** | nearest-neighbour over past payees | rejected: a new dependency, non-deterministic output, unexplainable to the user |
| **E. hierarchy inheritance** | parent category default flows to children | rejected: we just shipped the tree for reporting; using it for classification makes both harder to reason about |

## 3. One resolver, three entry points

A pure function, called by the suggest handler and the capture/import create handlers:

```
Suggest(kind, payee, text) Suggestion
  Suggestion{AccountRef, Why, RuleRef, Tier}
```

Order — first match wins, and it is not configurable:

1. **Tier `payee_default`** — the payee's `default_category_ref` (phase 1 writes it).
2. **Tier `rule_exact`** — a rule whose pattern equals the payee name, case-folded.
3. **Tier `rule_contains`** — `contains`/`prefix` on the payee name, then `contains`/`prefix`
   on the note (first hit, ordered by priority, then pattern length, then `created_at`).
4. **Tier `none`** — `Unsorted`, with `Why: "no match"`.

There is no `vendor` tier. Recurring drafts skip this ladder entirely.

Tie-breaking is part of the contract: **priority descending → pattern length descending →
`created_at` ascending**. Two rules that both match always resolve the same way on every
resolver call and in every test.

The resolver is pure (no ctx, no I/O) except for reading the rule set, which the caller
passes in: that is what makes it table-testable and identical on the paths that call it.

## 4. Where it runs

| touchpoint | what it returns | does it write? |
| --- | --- | --- |
| `POST /api/captures` response | `suggested_category_ref` | no |
| `GET /api/captures` rows | no suggestion field | no |
| `GET /api/payees?query=` | each payee's `default_category_ref` (already there) | no |
| `PATCH /api/captures/{ref}` `approve` | when the body sends a payee and a category, the approved category is stored as the payee's default — unless the body says `{"learn": false}` | yes (payee row, audited) |
| `POST /api/imports` response rows | `suggested_category_ref` next to each clash verdict | no |
| recurring drafts | `rule.CategoryRef` or `Unsorted` — the resolver is not called | no |

**Nothing in the ledger is written by a suggestion.** Capture approval and import commit
stay the only write paths, which keeps invariant 6 intact.

## 5. Data sketch (the rule table in the consolidated `0001` migration)

```
categorization_rules
  id          INTEGER PK
  ref         TEXT NOT NULL UNIQUE        -- 32 hex
  pattern     TEXT NOT NULL               -- ≤ 80, trimmed, case-folded on write
  field       TEXT NOT NULL CHECK (field IN ('payee','note'))
  match_kind  TEXT NOT NULL CHECK (match_kind IN ('exact','contains','prefix'))
  account_id  INTEGER NOT NULL REFERENCES accounts(id)  -- the category
  priority    INTEGER NOT NULL DEFAULT 0  -- higher wins
  archived_at TEXT NULL
  created_at  TEXT NOT NULL
```

No `regex` in v1: a substring covers the real cases, and a regex column is a foot-gun in a
single-user app (catastrophic backtracking is a support ticket, not a feature). Live caps:
≤ 200 rules, `pattern` 2–80 characters.

Phase 1 needs no column at all: `payees.default_category_id` already exists.

## 6. API sketch

| method | route | body | answers |
| --- | --- | --- | --- |
| `GET` | `/api/categorization/rules` | `?include_archived`, `?account_ref` | the rules, ordered by `priority DESC, created_at` |
| `POST` | `/api/categorization/rules` | `{pattern, field, match_kind, category_ref, priority?}` | `201`, `409 duplicate` on an identical `(pattern, field, match_kind)`, `422 invalid_request` for `note`+`exact` |
| `PATCH` | `/api/categorization/rules/{ref}` | `{pattern?, category_ref?, priority?, archived?}` | the rule |
| `GET` | `/api/categorization/suggest` | `?payee_ref=&text=&kind=expense` | `{account_ref, why, tier, rule_ref?}` — the same resolver, callable by a client that already has the text |

`POST /api/captures` and each row of `POST /api/imports` grow one **response** field
(`suggested_category_ref`); `PATCH /api/captures/{ref}` grows one **request** flag (`learn`).
`GET /api/captures` rows do not carry the field.

## 7. RRR

**Requirements**

1. The same merchant produces the same suggestion on the suggest route and the
   capture/import create prefill: one resolver, one precedence order, one tie-break,
   table-tested with golden cases. Recurring drafts are outside this path.
2. A suggestion never posts. Only `approve` and `commit` write the ledger.
3. Every suggestion says **why**: `tier` plus the matching `rule_ref` when there is one.
4. Learning (`phase 1`) only fills an **empty** payee default and is audited
   (`payee/update`, `from` → `to`); a body can opt out with `{"learn": false}`.
5. A rule that points at an archived category is skipped, never applied.
6. Nothing is inferred from the amount, the day of the week or the account: a suggestion
   must be explainable in one sentence. `field` is `payee`/`note`; `note`+`exact` is refused.

**Risks**

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a wrong default becomes permanent | every future `KOPI` lands in the wrong category | learning happens once per payee, is visible on the payee sheet, and is a `PATCH` away from being fixed |
| two categories fit (`INDOMARET` = grocery vs. personal food) | ambiguity is real, not a resolver bug | the suggestion is always editable, `Why` names the rule, and the import row shows it per row rather than silently |
| a broad pattern swallows everything (`pattern: "A"`) | one rule files half the ledger | minimum pattern length 2, a 200-rule live cap, and the resolver returns `rule_ref` so the offender is identifiable |
| archived category in a rule | `404 not_found` on the next commit | the resolver skips it; the rule stays listed and identifiable by `rule_ref` |
| multi-language merchants (ID/EN spelling) | no rule fires | a rule per spelling; the phase-1 default is per payee, so one payee can carry both |
| vendor suggestion drifts | a re-run of the extractor changes the guess | not shipped: the resolver has no `vendor` tier, and `config.SelectRail` builds SnapToJSON only |

**Rollout**

1. **Phase 1 — learn on approve** (shipped). One behaviour, no schema, no new route: the
   approve path writes an empty payee default from the postings the user chose.
2. **Phase 2 — the rules table** plus `GET /api/categorization/suggest` (shipped,
   consolidated migration `0001`).
3. **Phase 3 — create prefill** (shipped on `POST /api/captures` and `POST /api/imports`).
   `GET /api/captures` rows and recurring drafts still bypass the resolver.
4. **Not shipped**: import-row learning, history dry run, `field: note` with
   `match_kind: exact`, and a saved-view `income` kind.

## 8. Open questions

1. **Does phase 1 learn on import commits too?** Open: not wired; only an approval learns.
2. **Should a rule be allowed to name a parent category?** *(leaning: no — the resolver
   answers with a leaf; the tree stays a reporting tool.)*
3. **Do we need `field: 'text'`?** Decided no: the schema and handler accept `payee` and
   `note` only.
4. **Confidence** — do we surface `tier` as a number? *(leaning: no numbers; a tier name is
   honest, a fake 0.87 is not.)*

## 9. Exit criteria (promote to `../features/`)

- [x] phase 1 shipped: approve fills an empty payee default, audited, `learn` flag, UAT
- [x] resolver is pure and table-tested with the golden cases (`KOPI`, `WHISKAS`,
      `INDOMARET`, an unmatched text)
- [x] phase 2: table + four routes + endpoint pages + `docs/v2-api.md` (migration `0001`)
- [x] capture/import create responses carry `suggested_category_ref` (additive) and a
      snapshot proves it
- [x] the deck's F2/F6 pages say where the suggestion appears, and that it never posts
- [ ] import-row learning and resolver-based recurring drafts
- [ ] `field: note` with `match_kind: exact` and a saved-view `income` kind
