Feature: PATCH /api/recurring/{ref}
  One file per route: every scenario here calls PATCH /api/recurring/{ref}.

  Scenario: A rule is paused and its amount corrected
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Spotify"}
      """
    And the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","amount_minor":"9900","currency":"IDR","cadence":"monthly","next_due_on":"2026-12-01"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"state":"paused","amount_minor":"10900"}
      """
    And I send a PATCH to "/api/recurring/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON at "$.state" is "paused"
    And the response JSON at "$.amount_minor" is "10900"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"state":"paused"}
      """
    When I send a PATCH to "/api/recurring/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
