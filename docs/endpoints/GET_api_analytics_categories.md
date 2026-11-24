# GET /api/analytics/categories

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

The pie namespace: how much each category account moved in a range. Same date filter as
`/api/analytics/months`, different grouping — accounts instead of calendar months.

## Upstream

The category chart, the dashboard's "top category" tile, an agent summarising a month.

## Downstream

`Repository.Sqlite.CategoryTotals`: one grouped query over postings joined to entries and
accounts, filtered by `kind`, voided entries and reversals excluded. With
`rollup=parent` the handler calls `Repository.Sqlite.CategoryTotalsByRoot` instead, which
walks every account up to its top-most ancestor in a recursive CTE and groups by that
root, so a child's amount lands on its root and the children drop out of the answer.

## Path / query params

| name | type | required | notes |
| --- | --- | --- | --- |
| `from` | string | no | `YYYY-MM-DD`; defaults to 11 months back, first of month |
| `to` | string | no | `YYYY-MM-DD`; defaults to today |
| `kind` | string | no | `expense` (default) or `income` |
| `rollup` | string | no | `parent` sums each child into its top-most ancestor and lists only roots; absent keeps one row per account |

## Body

None.

## Response

**200** `{"from":"2026-02-01","to":"2026-02-28","kind":"expense","categories":[{"account_ref":"…","account_name":"Unsorted","amount_minor":"25000"}]}`

Ordered by amount, descending; categories that net to zero are dropped. With
`rollup=parent` every `account_ref` is a root and `amount_minor` is the sum of the whole
subtree; without the flag the body is byte-identical to a build that has no hierarchy.

## Errors

`422 invalid_request` for a malformed date, a `kind` outside the two, or a `rollup` other
than `parent`.

## Limitations

Roll-up is one level of nesting in the answer, not in the data: a grandchild still lands
on the same root. No currency conversion in the grouping — the number is always
base-currency minor units.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Analytics handler
    participant DB as SQLite
    C->>H: GET /api/analytics/categories?from&to&kind&rollup
    H->>H: default window, default kind = expense
    alt rollup=parent
        H->>DB: recursive CTE up to the root, SUM(base_amount) GROUP BY root
    else
        H->>DB: SELECT account, SUM(base_amount) GROUP BY account
    end
    DB-->>H: rows, zero rows dropped
    H-->>C: 200 {from, to, kind, categories[]}
```
