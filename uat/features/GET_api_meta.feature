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
