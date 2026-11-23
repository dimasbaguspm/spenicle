Feature: POST /api/accounts
  One file per route: every scenario here calls POST /api/accounts.

  Scenario: A new category is created with the base currency
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    Then the response status is 201
    And the response JSON at "$.name" is "Groceries"
    And the response JSON at "$.kind" is "expense"
    And the response JSON at "$.currency" is "IDR"
    And the response JSON at "$.archived" is "false"

  Scenario: An unknown kind is refused
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Nowhere","kind":"imaginary"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_request"

  Scenario: An unknown currency is refused
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Nowhere","kind":"asset","currency":"XXX"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_currency"
