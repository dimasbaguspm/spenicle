Feature: POST /api/recurring
  One file per route: every scenario here calls POST /api/recurring.

  Scenario: A monthly rule is created in the active state
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
    And the response JSON matches the snapshot "post_api_recurring__a_monthly_rule_is_created_in_the_active_state"

  Scenario: An unknown cadence is refused
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Nobody"}
      """
    And the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","amount_minor":"1000","currency":"IDR","cadence":"hourly","next_due_on":"2026-12-20"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_recurring__an_unknown_cadence_is_refused"
