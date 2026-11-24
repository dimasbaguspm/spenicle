Feature: POST /api/tokens/{ref}/revoke
  One file per route: every scenario here calls POST /api/tokens/{ref}/revoke or
  uses a token it revoked.

  Scenario: A revoked token stops authenticating
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    Then the response status is 200
    When the request body is:
      """json
      {"name":"iphone-shortcut","scopes":["captures:read","captures:write"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the issued token is the bearer credential
    And I send a GET to "/api/captures"
    Then the response status is 200
    When only the root session is used
    And I send a POST to "/api/tokens/{{ref}}/revoke"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_tokens_ref_revoke__a_revoked_token_is_listed_once"
    And the journal holds 2 "api_token" rows
    When the same token is the bearer credential again
    And I send a GET to "/api/captures"
    Then the response status is 401
    And the response JSON matches the snapshot "post_api_tokens_ref_revoke__the_revoked_token_is_unauthorized"

  Scenario: Revoking something that is not there answers 404
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    Then the response status is 200
    When I send a POST to "/api/tokens/00000000000000000000000000000000/revoke"
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_tokens_ref_revoke__an_unknown_token_is_not_found"
