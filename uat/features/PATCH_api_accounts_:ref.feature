Feature: PATCH /api/accounts/{ref}
  One file per route: every scenario here calls PATCH /api/accounts/{ref}.

  Scenario: A category is renamed and archived
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Odd Jobs","kind":"income"}
      """
    And the request body is:
      """json
      {"name":"Side Gigs","archived":true}
      """
    And I send a PATCH to "/api/accounts/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON at "$.name" is "Side Gigs"
    And the response JSON at "$.archived" is "true"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"name":"Whatever"}
      """
    When I send a PATCH to "/api/accounts/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
