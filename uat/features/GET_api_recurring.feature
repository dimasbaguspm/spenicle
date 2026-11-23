Feature: GET /api/recurring
  One file per route: every scenario here calls GET /api/recurring.

  Scenario: An empty rule list answers an empty array
    Given a running API
    When I send a GET to "/api/recurring"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_recurring__an_empty_rule_list_answers_an_empty_array"

  Scenario: A created rule is listed with its defaults
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    And the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"monthly","interval_n":1,"day_of_month":20,"next_due_on":"2026-12-20"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/recurring"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_recurring__a_created_rule_is_listed_with_its_defaults"

  Scenario: The cadence filter narrows the listing
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    And the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","amount_minor":"25000","currency":"IDR","cadence":"monthly","next_due_on":"2026-12-20"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/recurring?cadence=weekly"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_recurring__the_cadence_filter_narrows_the_listing"
