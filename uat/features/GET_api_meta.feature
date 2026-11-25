Feature: GET /api/meta
  One file per route: every scenario here calls GET /api/meta.

  Scenario: A fresh database bootstraps with the seeded accounts
    Given a running API
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_meta__a_fresh_database_bootstraps_with_the_seeded_accounts"

  Scenario: Balances come from postings, not from a stored column
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_meta__balances_come_from_postings_not_from_a_stored_column"

  Scenario: The currency list is embedded, not a table
    Given a running API
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_meta__the_currency_list_is_embedded_not_a_table"

  Scenario: Payees and recurring rules arrive with the bootstrap payload
    Given a running API
    When I send a POST to "/api/payees" with:
      """
      {"name":"Kopi Kenangan","default_account_ref":"{{account:Cash}}","default_category_ref":"{{account:Unsorted}}"}
      """
    Then the response status is 201
    And the request body is:
      """
      {"payee_ref":"{{ref}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"monthly","next_due_on":"2026-12-20"}
      """
    And I send a POST to "/api/recurring" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_meta__payees_and_recurring_rules_arrive_with_the_bootstrap_payload"

  Scenario: The bootstrap payload carries the first-boot password requirement
    Given the instance password is "uat-password-1234"
    And the instance password must be changed
    And a running API
    And I sign in with the instance password
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_meta__the_bootstrap_payload_carries_the_first_boot_password_requirement"
