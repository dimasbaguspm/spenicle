Feature: POST /api/categorization/rules
  One file per route: every scenario here calls POST /api/categorization/rules.

  Scenario: A rule maps a pattern to a category
    Given a running API
    And the account "Cat" exists as "expense"
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"WHISKAS","field":"payee","match_kind":"exact","category_ref":"{{account:Cat}}","priority":5}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_categorization_rules__a_rule_maps_a_pattern_to_a_category"

  Scenario: A duplicate live rule is refused
    Given a running API
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"INDOMARET","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_categorization_rules__a_duplicate_live_rule_is_refused"

  Scenario: A rule on an asset account is refused
    Given a running API
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Cash}}"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_categorization_rules__a_rule_on_an_asset_account_is_refused"

  Scenario: An unknown category is refused
    Given a running API
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"00000000000000000000000000000000"}
      """
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_categorization_rules__an_unknown_category_is_refused"

  Scenario: A one character pattern is refused
    Given a running API
    And the account "Grocery" exists as "expense"
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":" i ","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_categorization_rules__a_one_character_pattern_is_refused"

  Scenario: A note rule cannot be exact
    Given a running API
    And the account "Cat" exists as "expense"
    When I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"whiskas","field":"note","match_kind":"exact","category_ref":"{{account:Cat}}"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_categorization_rules__a_note_rule_cannot_be_exact"
