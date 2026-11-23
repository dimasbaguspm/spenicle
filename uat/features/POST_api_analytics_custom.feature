Feature: POST /api/analytics/custom
  One file per route: every scenario here calls POST /api/analytics/custom.

  Scenario: A saved query remembers its namespace and chart
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Spend per month","namespace":"months","chart":"bar"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_analytics_custom__a_saved_query_remembers_its_namespace_and_chart"

  Scenario: An unknown namespace is refused
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Nope","namespace":"quarters","chart":"bar"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_analytics_custom__an_unknown_namespace_is_refused"
