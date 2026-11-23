Feature: GET /api/analytics/months
  One file per route: every scenario here calls GET /api/analytics/months.

  Scenario: Expense is grouped into the month it happened
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-01-15","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"10000"},{"account_ref":"{{account:Cash}}","amount_minor":"-10000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/analytics/months" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-01-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON at "$.from" is "2026-01-01"
    And the response JSON at "$.to" is "2026-02-28"
    And the response JSON at "$.months[0].month" is "2026-01"
    And the response JSON at "$.months[0].spend_minor" is "10000"
    And the response JSON at "$.months[1].month" is "2026-02"
    And the response JSON at "$.months[1].spend_minor" is "25000"

  Scenario: A voided entry leaves no trace in the series
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-03-05","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"5000"},{"account_ref":"{{account:Cash}}","amount_minor":"-5000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"void":true,"reason":"mistake"}
      """
    And I send a PATCH to "/api/entries/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/analytics/months" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-03-01 |
      | query | to   | 2026-03-31 |
    Then the response status is 200
    And the response JSON at "$.months" is "[]"

  Scenario: A malformed date is refused
    Given a running API
    When I send a GET to "/api/analytics/months" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-13-01 |
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_request"
