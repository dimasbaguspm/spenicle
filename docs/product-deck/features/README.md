# Features — shipped, and ready to build

A page per user-facing feature, written from the client app's point of view. Every page
here follows the same six sections, so a reader can jump to the part they need:

1. **The job the user has** — one paragraph, no solution.
2. **Client journeys** — the multi-hit call tables, with why each hit is unavoidable.
3. **Backend, end to end** — `Handler → Module → Repository`, the invariants, what is sealed.
4. **RRR** — Requirements (testable), Risks (with mitigation), Rollout (order + rollback).
5. **Acceptance criteria** — Gherkin, in the repo's own step vocabulary.
6. **What this page does not promise** — the edge, stated.

## Shipped

| page | feature | state |
| --- | --- | --- |
| [F1](./01-access-and-bootstrap.md) | open the instance, then keep it closed | live |
| [F2](./02-capture-inbox.md) | capture now, decide later | live |
| [F3](./03-ledger.md) | the ledger is the truth | live (void, payee, correction) |
| [F4](./04-accounts-and-payees.md) | accounts, categories, merchants | live (parent tree, roll-up) |
| [F5](./05-recurring.md) | predictable money arrives on its own | live |
| [F6](./06-statement-import.md) | a bank CSV becomes a reviewable draft | live |
| [F7](./07-insights.md) | how did the month go | live |
| [F8](./08-export.md) | the door out | live |
| [F9](./09-gaps-and-next.md) | what we cannot ship yet | live (the honest list) |

"Live" means: the routes exist, the UAT suite covers them, `make test` is green and the
endpoint docs under [`../../endpoints/`](../../endpoints/README.md) match the code.

## Ready to build (not shipped)

Nothing has graduated yet. The closest is **`plan/categories.md` phase 1** — learning a
payee's category on approval — which needs no schema change, no new route and no new
dependency. It is the first slice of the [categories plan](../plan/categories.md).

The other two plans are still asking their questions:
[budget](../plan/budget.md) waits on rollover and period, and
[account-groups](../plan/account-groups.md) waits on the group-vs-parent separation.

## How a page gets here

A plan graduates out of [`../plan/`](../plan/README.md) when every open question in it has
an answer, the migration exists, the routes have endpoint pages, and the page below can be
written in the six sections above **with acceptance criteria that already pass**. A page is
never written in advance of the code: it is the contract, not the wish.
