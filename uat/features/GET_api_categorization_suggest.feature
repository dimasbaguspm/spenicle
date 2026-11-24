Feature: GET /api/categorization/suggest
  One file per route: every scenario here calls GET /api/categorization/suggest.

  Scenario: A payee default beats a rule
    Given a running API
    And the account "Cat" exists as "expense"
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"whiskas","field":"payee","match_kind":"exact","category_ref":"{{account:Grocery}}"}
      """
    And I send a POST to "/api/payees" with:
      """json
      {"name":"WHISKAS","default_category_ref":"{{account:Cat}}"}
      """
    And the last ref is remembered as "payee"
    When I send a GET to "/api/categorization/suggest?payee_ref={{ref:payee}}&text=WHISKAS"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_suggest__a_payee_default_beats_a_rule"

  Scenario: An exact rule beats a contains rule
    Given a running API
    And the account "Cat" exists as "expense"
    And the account "Personal food" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"kopi","field":"payee","match_kind":"contains","category_ref":"{{account:Personal food}}"}
      """
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"kopi kenangan","field":"payee","match_kind":"exact","category_ref":"{{account:Cat}}"}
      """
    When I send a GET to "/api/categorization/suggest?text=KOPI+KENANGAN"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_suggest__an_exact_rule_beats_a_contains_rule"

  Scenario: The longer pattern wins the tie-break
    Given a running API
    And the account "Cat" exists as "expense"
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret point","field":"payee","match_kind":"contains","category_ref":"{{account:Cat}}"}
      """
    When I send a GET to "/api/categorization/suggest?text=INDOMARET+POINT"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_suggest__the_longer_pattern_wins_the_tie_break"

  Scenario: A rule on an archived category is skipped
    Given a running API
    And the account "Cat" exists as "expense"
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Cat}}","priority":9}
      """
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"prefix","category_ref":"{{account:Grocery}}"}
      """
    And the request body is:
      """json
      {"archived":true}
      """
    And I send a PATCH to "/api/accounts/{{account:Cat}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/categorization/suggest?text=INDOMARET"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_suggest__a_rule_on_an_archived_category_is_skipped"

  Scenario: No match answers none with the Unsorted category
    Given a running API
    And the account "Grocery" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"indomaret","field":"payee","match_kind":"contains","category_ref":"{{account:Grocery}}"}
      """
    When I send a GET to "/api/categorization/suggest?text=TOKO+ROTI"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_categorization_suggest__no_match_answers_none_with_unsorted"

  Scenario: An unknown payee ref answers 404
    Given a running API
    And the account "Personal food" exists as "expense"
    And I send a POST to "/api/categorization/rules" with:
      """json
      {"pattern":"warung","field":"note","match_kind":"contains","category_ref":"{{account:Personal food}}"}
      """
    When I send a GET to "/api/categorization/suggest?text=WARTEG+BAHARI&payee_ref=00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_categorization_suggest__an_unknown_payee_ref_answers_404"

  Scenario: A suggestion without a payee or a text is refused
    Given a running API
    When I send a GET to "/api/categorization/suggest"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_categorization_suggest__a_suggestion_without_input_is_refused"
