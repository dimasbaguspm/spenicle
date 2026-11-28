Feature: GET /api/analytics/overview
  One file per route: every scenario here calls GET /api/analytics/overview.

  Scenario: One read carries the months, the roots, the payees and the cash
    Given a running API
    And the account "Salary" exists as "income"
    And I send a POST to "/api/payees" with:
      """json
      {"name":"Corner shop"}
      """
    And the request body is:
      """json
      {"occurred_on":"2026-01-10","currency":"IDR","payee_ref":"{{ref}}","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"10000"},{"account_ref":"{{account:Cash}}","amount_minor":"-10000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"occurred_on":"2026-02-05","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"50000"},{"account_ref":"{{account:Salary}}","amount_minor":"-50000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/analytics/overview" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-01-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_overview__one_read_carries_every_block"

  Scenario: A malformed date is refused
    Given a running API
    When I send a GET to "/api/analytics/overview" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-13-01 |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_analytics_overview__a_malformed_date_is_refused"
