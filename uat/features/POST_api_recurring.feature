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
    And the response JSON at "$.cadence" is "monthly"
    And the response JSON at "$.interval_n" is "1"
    And the response JSON at "$.day_of_month" is "20"
    And the response JSON at "$.state" is "active"
    And the response JSON at "$.origin" is "user"
    And the response JSON at "$.next_due_on" is "2026-12-20"

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
    And the response JSON at "$.error.code" is "invalid_request"
