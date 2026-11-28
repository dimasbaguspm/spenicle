Feature: GET /api/bootstrap
  One file per route: every scenario here calls GET /api/bootstrap.

  Scenario: A fresh instance says the ledger is not opened
    Given a running API
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__a_fresh_instance_is_not_open"

  Scenario: The gate is readable without a credential
    Given the instance password is "generated-pass-123"
    And the instance password must be changed
    And a running API
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__the_gate_is_readable_without_a_credential"

  Scenario: Completing the setup flips setup_completed and locks the currency
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"base_currency":"usd"}
      """
    Then the response status is 200
    When I send a GET to "/api/bootstrap"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_bootstrap__setup_completed"

  Scenario: A claimed instance reports a current password
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
    And the response JSON matches the snapshot "get_api_bootstrap__a_claimed_instance"
