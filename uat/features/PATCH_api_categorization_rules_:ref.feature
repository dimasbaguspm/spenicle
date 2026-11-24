Feature: PATCH /api/categorization/rules/{ref}
  One file per route: every scenario here calls PATCH /api/categorization/rules/{ref}.

  Scenario: A rule is repointed, prioritised and archived
    Given a running API
    And the account "Cat" exists as "expense"
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    And the request body is:
      """json
      {"pattern":"INDOMARET POINT","category_ref":"{{account:Cat}}","priority":10,"archived":true}
      """
    When I send a PATCH to "/api/categorization/rules/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_categorization_rules_:ref__a_rule_is_repointed_prioritised_and_archived"

  Scenario: An unknown ref answers 404
    Given a running API
    And the request body is:
      """json
      {"priority":1}
      """
    When I send a PATCH to "/api/categorization/rules/00000000000000000000000000000000" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 404
    And the response JSON matches the snapshot "patch_api_categorization_rules_:ref__an_unknown_ref_answers_404"

  Scenario: A repoint onto an asset account is refused
    Given a running API
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    And the request body is:
      """json
      {"category_ref":"{{account:Cash}}"}
      """
    When I send a PATCH to "/api/categorization/rules/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_categorization_rules_:ref__a_repoint_onto_an_asset_account_is_refused"
