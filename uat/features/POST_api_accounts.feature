Feature: POST /api/accounts
  One file per route: every scenario here calls POST /api/accounts.

  Scenario: A new category is created with the base currency
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_accounts__a_new_category_is_created_with_the_base_currency"

  Scenario: An unknown kind is refused
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Nowhere","kind":"imaginary"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_accounts__an_unknown_kind_is_refused"

  Scenario: An unknown currency is refused
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Nowhere","kind":"asset","currency":"XXX"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_accounts__an_unknown_currency_is_refused"
