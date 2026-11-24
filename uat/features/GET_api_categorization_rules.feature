Feature: GET /api/categorization/rules
  One file per route: every scenario here calls GET /api/categorization/rules.

  Scenario: An empty rule list answers an empty array
    Given a running API
    When I send a GET to "/api/categorization/rules"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_rules__an_empty_rule_list_answers_an_empty_array"

  Scenario: A created rule is listed with its category
    Given a running API
    And the account "Grocery" exists as "expense"
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"  INDOMARET  ","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    Then the response status is 201
    When I send a GET to "/api/categorization/rules"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_rules__a_created_rule_is_listed_with_its_category"

  Scenario: An archived rule is listed only when it is asked for
    Given a running API
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    And the request body is:
      """json
      {"archived":true}
      """
    And I send a PATCH to "/api/categorization/rules/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    When I send a GET to "/api/categorization/rules"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_rules__an_archived_rule_is_hidden_by_default"
    When I send a GET to "/api/categorization/rules?include_archived=true"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_rules__include_archived_lists_the_archived_rule"

  Scenario: The account filter keeps the rules of one category
    Given a running API
    And the account "Grocery" exists as "expense"
    And the account "Personal food" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"kopi kenangan","field":"payee","match_kind":"prefix","category_ref":"{{account:Personal food}}"}
      """
    When I send a GET to "/api/categorization/rules?account_ref={{account:Grocery}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_rules__the_account_filter_keeps_one_category"
