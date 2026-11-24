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

  Scenario: A duplicate name is refused with a conflict
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_accounts__a_duplicate_name_is_refused_with_a_conflict"

  Scenario: A sub-category is created under its parent
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Food","kind":"expense"}
      """
    And the last ref is remembered as "food"
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"{{ref:food}}"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_accounts__a_sub_category_is_created_under_its_parent"

  Scenario: A parent of another kind is refused
    Given a running API
    And the account "Cash" exists as "asset"
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"{{account:Cash}}"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_accounts__a_parent_of_another_kind_is_refused"

  Scenario: An unknown parent is refused
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"00000000000000000000000000000000"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_accounts__an_unknown_parent_is_refused"

  Scenario: A fourth level is refused
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Food","kind":"expense"}
      """
    And the last ref is remembered as "food"
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"{{ref:food}}"}
      """
    And the last ref is remembered as "groceries"
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Vegetables","kind":"expense","parent_ref":"{{ref:groceries}}"}
      """
    And the last ref is remembered as "vegetables"
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Leafy Greens","kind":"expense","parent_ref":"{{ref:vegetables}}"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_accounts__a_fourth_level_is_refused"
