Feature: Worker
  The recurring worker, not a route: a rule that comes due queues its capture
  exactly once, however often the process runs, and never writes the ledger.

  Scenario: A rule due yesterday queues exactly one capture
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
    Then the recurring worker reports "1" queued
    When I send a GET to "/api/captures"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_rule_due_yesterday_queues_exactly_one_capture"
    When the recurring worker runs
    Then the recurring worker reports "0" queued
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | ledger_entries | 0     |

  Scenario: A paused rule queues nothing
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
    Then the recurring worker reports "0" queued
    When I send a GET to "/api/captures"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_paused_rule_queues_nothing"

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
    Then the recurring worker reports "3" queued
    And the store holds:
      | table          | count |
      | captures       | 3     |
      | ledger_entries | 0     |
    When I send a GET to "/api/recurring"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_monthly_rule_due_three_months_ago_catches_up"

  Scenario: A rule past its ends_on queues nothing
    Given the recurring worker clock is "2026-04-15"
    And a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"weekly","interval_n":1,"next_due_on":"2026-04-12","ends_on":"2026-04-13"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/recurring"
    Then the response status is 200
    And the response JSON matches the snapshot "worker__a_rule_past_its_ends_on_queues_nothing"
    When the recurring worker runs
    Then the recurring worker reports "0" queued
    And the store holds:
      | table          | count |
      | captures       | 0     |
      | ledger_entries | 0     |

  Scenario: Approving a queued rule writes the entry once
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
    Then the recurring worker reports "1" queued
    When I send a GET to "/api/captures"
    And the first capture ref is remembered
    When the request body is:
      """json
      {"action":"approve","occurred_on":"2026-04-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a PATCH to "/api/captures/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    And the response JSON matches the snapshot "worker__approving_a_queued_rule_writes_the_entry_once"
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | ledger_entries | 1     |
    When the request body is:
      """json
      {"action":"approve","occurred_on":"2026-04-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a PATCH to "/api/captures/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 409
    And the response JSON matches the snapshot "worker__approving_a_queued_rule_twice_is_refused"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |
