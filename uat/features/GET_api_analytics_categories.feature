Feature: GET /api/analytics/categories
  One file per route: every scenario here calls GET /api/analytics/categories.

  Scenario: Expense is grouped by category
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-02-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_categories__expense_is_grouped_by_category"

  Scenario: An unknown kind is refused
    Given a running API
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key  | value   |
      | query | kind | neither |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_analytics_categories__an_unknown_kind_is_refused"
