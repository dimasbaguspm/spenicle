Feature: POST /api/setup
  One file per route: every scenario here calls POST /api/setup.

  Scenario: The base currency is chosen before the first entry
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"base_currency":"usd"}
      """
    Then the response status is 200
    And the response JSON at "$.base_currency" is "USD"

  Scenario: An empty setup is refused
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "empty_setup"

  Scenario: The currency is locked after the first entry
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"base_currency":"USD"}
      """
    When I send a POST to "/api/setup" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 409
    And the response JSON at "$.error.code" is "base_currency_locked"
