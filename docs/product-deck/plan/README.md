# Plans — brainstormed, not built

A plan is what we write **before** a feature: the job, the options we threw away, the
decision we are leaning towards, and the questions that must be answered before anyone
writes code. A plan is allowed to be wrong; a feature page is not.

| plan | the question | state |
| --- | --- | --- |
| [budget](./budget.md) | "Rp 1 500 000 for food this month — am I okay?" | decisions open (rollover, period) |
| [account-groups](./account-groups.md) | "show me all liquid money, not one account" | decisions open (taxonomy vs. tags) |
| [categories](./categories.md) | "KOPI KENANGAN should always land in Personal food, without me thinking" | **closest to ready**: phase 1 needs no schema change |

## How a plan graduates

1. Every question in **Open questions** gets an answer, in this file, under **Decision**.
2. The data sketch becomes a migration and a table in [`../../v2-api.md`](../../v2-api.md).
3. The API sketch becomes route pages under [`../../endpoints/`](../../endpoints/README.md).
4. A page moves to [`../features/`](../features/README.md) in the same shape as F1–F9:
   journeys, backend end to end, RRR, acceptance criteria, what it does not promise.

## Rules that bind every plan here

These come from [`../../../AGENTS.md`](../../../AGENTS.md) and are not negotiable in a
brainstorm either:

- **refs, never integer ids** on the wire; every new table gets `id` + `ref`.
- **no deletes**: `archived_at`, `status`, `voided_at`.
- **money is integer minor units**, rates as `TEXT` + `big.Rat`.
- **derived, not stored**: a budget's `spent` and a group's `balance` are queries, never
  counters that can drift.
- **capture ≠ ledger**: a suggestion may prefill a form; only a human resolves it.
- **one container, one SQLite file**: no queue, no second service, no cron outside the image.
- **the base currency is locked**: a per-currency budget would be a new rule, not a field.

## A note on sequencing

`categories` phase 1 changes nothing in the schema and makes every other list better
(fewer `Unsorted` rows), so it goes first. `budget` needs categories to be stable —
budgeting `Unsorted` is meaningless. `account-groups` is orthogonal and can ship in
parallel, but only after the word "group" and the word "parent" mean different things,
which is the first open question in its plan.
