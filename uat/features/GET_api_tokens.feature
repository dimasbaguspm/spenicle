Feature: GET /api/tokens
  One file per route: every scenario here calls GET /api/tokens.

  Scenario: The listing never repeats a token secret
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    When the request body is:
      """json
      {"name":"iphone-shortcut","scopes":["captures:write","dashboard:read"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/tokens"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_tokens__the_listing_never_repeats_a_token_secret"

  Scenario: A token cannot list the tokens
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    When the request body is:
      """json
      {"name":"iphone-shortcut","scopes":["captures:write"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the issued token is the bearer credential
    And I send a GET to "/api/tokens"
    Then the response status is 403
    And the response JSON matches the snapshot "get_api_tokens__a_token_cannot_list_the_tokens"
