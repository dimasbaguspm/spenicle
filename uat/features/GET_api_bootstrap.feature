Feature: GET /api/bootstrap
  One file per route: every scenario here calls GET /api/bootstrap.

  Scenario: A fresh instance says the ledger is not opened
    Given a running API
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__a_fresh_instance_is_not_open"

  Scenario: A booted instance with a password reports its setup, not its credential
    Given the instance password is "generated-pass-123"
    And a running API
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__a_password_without_a_setup"

  Scenario: Completing the setup flips setup_completed and locks the currency
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"usd"}
      """
    Then the response status is 200
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__setup_completed"

  Scenario: A closed instance reports nothing a stranger can use
    Given the instance password is "generated-pass-123"
    And a running API
    And I sign in with the instance password
    When I send a POST to "/api/password" with:
      """json
      {"current_password":"generated-pass-123","new_password":"chosen-pass-456"}
      """
    Then the response status is 200
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__a_closed_instance"
