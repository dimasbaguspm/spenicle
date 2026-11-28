Feature: POST /api/password
  One file per route: every scenario here calls POST /api/password.

  Scenario: Changing the instance password succeeds
    Given the instance password is "generated-pass-123"
    And a running API
    And I sign in with the instance password
    When I send a POST to "/api/password" with:
      """json
      {"current_password":"generated-pass-123","new_password":"chosen-pass-456"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_password__changing_the_instance_password_succeeds"
    When the bearer credential is "chosen-pass-456"
    And I send a GET to "/api/meta"
    Then the response status is 200

  Scenario: The change mints the browser credential in the same call
    Given the instance password is "generated-pass-123"
    And a running API
    And I sign in with the instance password
    When I send a POST to "/api/password" with:
      """json
      {"current_password":"generated-pass-123","new_password":"chosen-pass-456","token":{"name":"spenicle web","scopes":["admin"]}}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_password__the_change_mints_the_browser_token"

  Scenario: A weak replacement is refused
    Given the instance password is "generated-pass-123"
    And a running API
    And I sign in with the instance password
    When I send a POST to "/api/password" with:
      """json
      {"current_password":"generated-pass-123","new_password":"weak-pass    "}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_password__a_weak_replacement_is_refused"

  Scenario: The forced-change gate leaves /api/meta open and clears after a change
    Given the instance password is "generated-pass-123"
    And the instance password must be changed
    And a running API
    And I sign in with the instance password
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_password__the_change_gate_leaves_meta_open"
    When I send a POST to "/api/password" with:
      """json
      {"current_password":"generated-pass-123","new_password":"chosen-pass-456"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_password__the_change_gate_clears_after_a_change"
    When the bearer credential is "chosen-pass-456"
    And I send a GET to "/api/entries"
    Then the response status is 200

  Scenario Outline: The forced-change gate blocks every other route
    Given the instance password is "generated-pass-123"
    And the instance password must be changed
    And a running API
    And I sign in with the instance password
    When I send a <method> to "<path>"
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_password__the_change_gate_blocks_every_other_route"

    Examples:
      | method | path           |
      | GET    | /api/entries   |
      | GET    | /api/tokens    |
      | GET    | /api/settings  |
      | GET    | /api/captures  |
      | POST   | /api/entries   |
      | GET    | /api/exports   |
      | POST   | /api/tokens    |
