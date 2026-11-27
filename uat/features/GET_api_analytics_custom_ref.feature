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
    And the response JSON matches the snapshot "get_api_analytics_custom_ref__a_saved_months_query_runs_over_the_requested_window"

  Scenario: An unknown ref answers 404
    Given a running API
    When I send a GET to "/api/analytics/custom/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_analytics_custom_ref__an_unknown_ref_answers_404"

  Scenario: A months view over a window with no rows omits the key
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"empty-window","namespace":"months","chart":"bar"}
      """
    Then the response status is 201
    And the last ref is remembered as "view"
    When I send a GET to "/api/analytics/custom/{{ref:view}}?from=2020-01-01&to=2020-02-29"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_custom_ref__a_window_with_no_rows_omits_months"
