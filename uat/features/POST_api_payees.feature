Feature: POST /api/payees
  One file per route: every scenario here calls POST /api/payees.

  Scenario: A payee remembers its default account
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan","default_category_ref":"{{account:Unsorted}}"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_payees__a_payee_remembers_its_default_account"

  Scenario: An unknown default account is refused
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Nobody","default_account_ref":"00000000000000000000000000000000"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_payees__an_unknown_default_account_is_refused"

  Scenario: A missing name is refused
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_payees__a_missing_name_is_refused"
