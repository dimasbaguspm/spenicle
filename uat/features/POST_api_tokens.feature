Feature: POST /api/tokens
  A token is the non-root credential: the API answers it with exactly the scopes
  it was created with, and it can never mint another one.

  Scenario: The root session mints a capture-only agent token
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    Then the response status is 200
    When the request body is:
      """json
      {"name":"iphone-shortcut","scopes":["captures:write"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_tokens__the_root_session_mints_a_capture_only_token"
    And the journal holds 1 "api_token" rows

  Scenario: A token stays inside its scopes and cannot mint another token
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    Then the response status is 200
    When the request body is:
      """json
      {"name":"iphone-shortcut","scopes":["captures:write"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the issued token is the bearer credential
    And the request body is:
      """json
      {"kind":"manual","raw_text":"coffee 25000"}
      """
    And I send a POST to "/api/captures" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 202
    And the last journal row names the token as its actor
    When I send a GET to "/api/entries"
    Then the response status is 403
    And the response JSON matches the snapshot "post_api_tokens__a_capture_token_cannot_read_the_ledger"
    When the request body is:
      """json
      {"name":"escalation","scopes":["*"]}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 403
    And the response JSON matches the snapshot "post_api_tokens__a_token_cannot_mint_another_token"

  Scenario Outline: An unusable token request is refused before a token exists
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    Then the response status is 200
    When the request body is:
      """json
      <body>
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is <status>
    And the response JSON matches the snapshot "post_api_tokens__an_unusable_request_is_refused_{{bodyhash}}"
    And the journal holds 0 "api_token" rows

    Examples:
      | body                                          | status |
      | {"name":"","scopes":["captures:write"]}        | 422    |
      | {"name":"agent"}                              | 422    |
      | {"name":"agent","scopes":[]}                   | 422    |
      | {"name":"agent","scopes":["ledger:read"]}      | 422    |
