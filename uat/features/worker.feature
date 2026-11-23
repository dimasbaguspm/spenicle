Feature: Worker
  The recurring worker, not a route: a rule that comes due posts its own entry
  exactly once, however often the process runs.

  Scenario: A rule due yesterday posts exactly one entry
    Given the recurring worker clock is "2026-04-15"
    And a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"weekly","interval_n":1,"next_due_on":"2026-04-14"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the recurring worker runs
    Then the recurring worker reports "1" posted
    When I send a GET to "/api/entries"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_rule_due_yesterday_posts_exactly_one_entry"
    When the recurring worker runs
    Then the recurring worker reports "0" posted
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: A paused rule posts nothing
    Given the recurring worker clock is "2026-04-15"
    And a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"weekly","next_due_on":"2026-04-14"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the request body is:
      """json
      {"state":"paused"}
      """
    And I send a PATCH to "/api/recurring/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    When the recurring worker runs
    Then the recurring worker reports "0" posted
    When I send a GET to "/api/entries"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_paused_rule_posts_nothing"

  Scenario: A monthly rule due three months ago catches up
    Given the recurring worker clock is "2026-04-15"
    And a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","amount_minor":"25000","currency":"IDR","cadence":"monthly","interval_n":1,"day_of_month":20,"next_due_on":"2026-01-20"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When the recurring worker runs
    Then the recurring worker reports "3" posted
    And the store holds:
      | table          | count |
      | ledger_entries | 3     |
    When I send a GET to "/api/recurring"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_monthly_rule_due_three_months_ago_catches_up"
