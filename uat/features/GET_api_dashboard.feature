Feature: GET /api/dashboard
  One file per route: every scenario here calls GET /api/dashboard.

  Scenario: The tiles come from the ledger, not from a stored counter
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"10000"},{"account_ref":"{{account:Cash}}","amount_minor":"-10000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/dashboard"
    Then the response status is 200
    And the response JSON at "$.base_currency" is "IDR"
    And the response JSON at "$.spend_minor" is "10000"
    And the response JSON at "$.net_minor" is "-10000"
    And the response JSON at "$.pending_captures" is "0"
    And the response JSON at "$.top_category.account_name" is "Unsorted"

  Scenario: An empty ledger answers zeroes instead of an error
    Given a running API
    When I send a GET to "/api/dashboard"
    Then the response status is 200
    And the response JSON at "$.spend_minor" is "0"
    And the response JSON at "$.income_minor" is "0"
