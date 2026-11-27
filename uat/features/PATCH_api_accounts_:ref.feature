Feature: PATCH /api/accounts/{ref}
  One file per route: every scenario here calls PATCH /api/accounts/{ref}.

  Scenario: A category is renamed and archived
    Given a running API
    When I send a POST to "/api/accounts" with:
      """json
      {"name":"Odd Jobs","kind":"income"}
      """
    And the request body is:
      """json
      {"name":"Side Gigs","archived":true}
      """
    And I send a PATCH to "/api/accounts/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_accounts_:ref__a_category_is_renamed_and_archived"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"name":"Whatever"}
      """
    When I send a PATCH to "/api/accounts/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON matches the snapshot "patch_api_accounts_:ref__an_unknown_ref_answers_404"

  Scenario: A category is moved under a parent
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Food","kind":"expense"}
      """
    And the last ref is remembered as "food"
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    And the last ref is remembered as "groceries"
    And the request body is:
      """json
      {"parent_ref":"{{ref:food}}"}
      """
    When I send a PATCH to "/api/accounts/{{ref:groceries}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_accounts_:ref__a_category_is_moved_under_a_parent"

  Scenario: A parent that would close a cycle is refused
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
    And the request body is:
      """json
      {"parent_ref":"{{ref:groceries}}"}
      """
    When I send a PATCH to "/api/accounts/{{ref:food}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_accounts_:ref__a_parent_that_would_close_a_cycle_is_refused"

  Scenario: A parent that does not exist is refused
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense"}
      """
    And the request body is:
      """json
      {"parent_ref":"00000000000000000000000000000000"}
      """
    When I send a PATCH to "/api/accounts/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_accounts_:ref__a_parent_that_does_not_exist_is_refused"

  Scenario: A kind change is an unknown field, never a silent rewrite
    Given a running API
    When I send a PATCH to "/api/accounts/{{account:Cash}}" with:
      """json
      {"kind":"expense"}
      """
    Then the response status is 400
    And the response JSON matches the snapshot "patch_api_accounts_:ref__a_kind_change_is_refused_as_unknown"
