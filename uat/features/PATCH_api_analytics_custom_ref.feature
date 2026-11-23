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
    And the response JSON matches the snapshot "patch_api_analytics_custom_ref__a_saved_query_is_renamed_and_its_chart_changed"

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
    And the response JSON matches the snapshot "patch_api_analytics_custom_ref__an_unknown_ref_answers_404"
