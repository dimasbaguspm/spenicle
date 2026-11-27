Feature: POST /api/tokens
  A token is the non-root credential: the API answers it with exactly the scopes
  it was created with, and it can never mint another one.

  Scenario: The root session mints a capture-only agent token
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
    And the response JSON matches the snapshot "post_api_tokens__the_root_session_mints_a_capture_only_token"
    And the journal holds 1 "api_token" rows

  Scenario: An expired token is refused and its expiry is exposed
    Given the API clock is "2026-03-01"
    And the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    When the request body is:
      """json
      {"name":"expired-agent","scopes":["entries:read"],"expires_at":"2026-02-28T00:00:00Z"}
      """
    And I send a POST to "/api/tokens" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_tokens__an_expired_token_is_minted"
    When the issued token is the bearer credential
    And I send a GET to "/api/entries"
    Then the response status is 401
    And the response JSON matches the snapshot "post_api_tokens__an_expired_token_is_refused"
  Scenario: A token stays inside its scopes and cannot mint another token
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

  Scenario: A capture token cannot approve, and the refusal names the scope it lacks
    Given the instance password is "uat-password-1234"
    And a running API
    When I sign in with the instance password
    And the request body is:
      """json
      {"name":"queue-only","scopes":["captures:write"]}
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
    And the last ref is remembered as "capture"
    When I send a PATCH to "/api/captures/{{ref:capture}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 403
    And the response JSON matches the snapshot "post_api_tokens__a_capture_token_cannot_approve"
