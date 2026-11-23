Feature: POST /api/analytics/custom
  One file per route: every scenario here calls POST /api/analytics/custom.

  Scenario: A saved query remembers its namespace and chart
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Spend per month","namespace":"months","chart":"bar"}
      """
    Then the response status is 201
    And the response JSON at "$.name" is "Spend per month"
    And the response JSON at "$.namespace" is "months"
    And the response JSON at "$.chart" is "bar"

  Scenario: An unknown namespace is refused
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Nope","namespace":"quarters","chart":"bar"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_request"
