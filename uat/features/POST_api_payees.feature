Feature: POST /api/payees
  One file per route: every scenario here calls POST /api/payees.

  Scenario: A payee remembers its default account
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan","default_category_ref":"{{account:Unsorted}}"}
      """
    Then the response status is 201
    And the response JSON at "$.name" is "Kopi Kenangan"
    And the response JSON at "$.default_category_ref" is "{{account:Unsorted}}"

  Scenario: An unknown default account is refused
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Nobody","default_account_ref":"00000000000000000000000000000000"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_reference"

  Scenario: A missing name is refused
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_request"
