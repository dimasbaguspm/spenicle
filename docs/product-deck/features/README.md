# Features — status, and what to build

A page per user-facing feature, written from the client app's point of view. Every page
here follows the same six sections, so a reader can jump to the part they need:

1. **The job the user has** — one paragraph, no solution.
2. **Client journeys** — the multi-hit call tables, with why each hit is unavoidable.
3. **Backend, end to end** — `Handler → Module → Repository`, the invariants, what is sealed.
4. **RRR** — Requirements (testable), Risks (with mitigation), Rollout (order + rollback).
5. **Acceptance criteria** — Gherkin, in the repo's own step vocabulary.
6. **What this page does not promise** — the edge, stated.

## Status

| page | feature | state |
| --- | --- | --- |
| [F1](./01-access-and-bootstrap.md) | open the instance, then keep it closed | partial: password change returns settings, no token; OAuth state is HMAC+TTL with no replay guard |
| [F2](./02-capture-inbox.md) | capture now, decide later | partial: OpenAI is UAT-only in production wiring; malformed POST JSON is `400 invalid_request`; retry and unbalanced approval are covered by UAT |
| [F3](./03-ledger.md) | the ledger is the truth | live on the core paths: payee patch mutates in place, other corrections void and repost |
| [F4](./04-accounts-and-payees.md) | accounts, categories, merchants | partial: create response omits `base_amount_minor`; no backend refusal to archive an account with active rules |
| [F5](./05-recurring.md) | predictable money arrives on its own | partial: 60-capture cap is implemented and covered by UAT; archive guard is client-side only |
| [F6](./06-statement-import.md) | a bank CSV becomes a reviewable draft | partial: effective multipart cap 11 MiB; final chunk omits suggestions; an expired event is unreachable through `GET .../events` |
| [F7](./07-insights.md) | how did the month go | partial: default window is UTC; duplicate custom-query `409` is covered by UAT |
| [F8](./08-export.md) | the door out | partial: resume runs before stale sweep and is covered by UAT; the stale-failure path is normally unreachable; filenames use a `spenicle-` prefix |
| [F9](./09-gaps-and-next.md) | what we cannot ship yet | the honest list, with stale text corrected |
| [F10](./10-categories.md) | categories that land in the same place every time | partial: recurring drafts bypass the resolver; import learning and note+exact rules are not shipped |

"Partial" means the routes exist but the named piece is missing or unverified. The UAT
suite asserts the scenarios named above; an acceptance block alone is not proof.

## Ships with the deck

Every page describes the current contract, not a promise that every path is live. Check
the page status before building against it, and treat the endpoint docs under
[`../../endpoints/`](../../endpoints/README.md) as secondary to the code when they disagree.
The two plans still asking questions are [budget](../plan/budget.md) (rollover, period) and
[account-groups](../plan/account-groups.md) (group vs. parent).

## How a page gets here

A plan graduates out of [`../plan/`](../plan/README.md) when every open question in it has
an answer, the migration exists, the routes have endpoint pages, and the page below can be
written in the six sections above **with acceptance criteria that already pass**. A page is
never written in advance of the code: it is the contract, not the wish.
