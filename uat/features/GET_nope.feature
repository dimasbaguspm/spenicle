Feature: GET /nope
  One file per route: every scenario here calls GET /nope.

  Scenario: An unknown route answers with a JSON error, not HTML
    Given a running API
    When I send a GET to "/nope"
    Then the response status is 404
    And the response JSON matches the snapshot "get_nope__an_unknown_route_answers_with_a_json_error_not_html"
