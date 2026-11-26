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
    When I send a GET to "/api/dashboard" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-02-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_dashboard__the_tiles_come_from_the_ledger_not_from_a_stored_counter"

  Scenario: An empty ledger answers zeroes instead of an error
    Given a running API
    When I send a GET to "/api/dashboard" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-02-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_dashboard__an_empty_ledger_answers_zeroes_instead_of_an_error"

  Scenario: The window is required
    Given a running API
    When I send a GET to "/api/dashboard"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_dashboard__the_window_is_required"

  Scenario: The window is capped
    Given a running API
    When I send a GET to "/api/dashboard" with headers/query:
      | type  | key  | value      |
      | query | from | 2025-02-01 |
      | query | to   | 2026-02-02 |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_dashboard__the_window_is_capped"
