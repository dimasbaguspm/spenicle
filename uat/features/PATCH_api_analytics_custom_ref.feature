Feature: PATCH /api/analytics/custom/{ref}
  One file per route: every scenario here calls PATCH /api/analytics/custom/{ref}.

  Scenario: A saved query is renamed and its chart changed
    Given a running API
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"By category","namespace":"categories","chart":"pie"}
      """
    And the request body is:
      """json
      {"name":"Spend by category","chart":"bar"}
      """
    And I send a PATCH to "/api/analytics/custom/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON at "$.name" is "Spend by category"
    And the response JSON at "$.chart" is "bar"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"chart":"line"}
      """
    When I send a PATCH to "/api/analytics/custom/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
