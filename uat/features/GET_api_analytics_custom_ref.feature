Feature: GET /api/analytics/custom/{ref}
  One file per route: every scenario here calls GET /api/analytics/custom/{ref}.

  Scenario: A saved months query runs over the requested window
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Monthly spend","namespace":"months","chart":"line"}
      """
    And I send a GET to "/api/analytics/custom/{{ref}}" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-01-01 |
      | query | to   | 2026-03-31 |
    Then the response status is 200
    And the response JSON at "$.query.namespace" is "months"
    And the response JSON at "$.query.chart" is "line"
    And the response JSON at "$.from" is "2026-01-01"
    And the response JSON at "$.to" is "2026-03-31"

  Scenario: An unknown ref answers 404
    Given a running API
    When I send a GET to "/api/analytics/custom/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
