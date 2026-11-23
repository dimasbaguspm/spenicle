Feature: PATCH /api/payees/{ref}
  One file per route: every scenario here calls PATCH /api/payees/{ref}.

  Scenario: A payee is renamed
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi"}
      """
    And the request body is:
      """json
      {"name":"Kopi Kenangan"}
      """
    And I send a PATCH to "/api/payees/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON at "$.name" is "Kopi Kenangan"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"name":"Nothing"}
      """
    When I send a PATCH to "/api/payees/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
