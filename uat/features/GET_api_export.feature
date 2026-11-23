Feature: GET /api/export
  One file per route: every scenario here calls GET /api/export.
  Arrays are compared order-insensitively here: every ref normalises to <ref>, so a
  by-ref order would otherwise flip between two runs against two fresh databases.

  @vendors
  Scenario: An empty ledger leaves with the accounts it started with
    Given a running API
    When I send a GET to "/api/export"
    Then the response status is 200
    And the response header "Content-Type" is "application/json"
    And the response header "Cache-Control" is "no-store"
    And the response header "Content-Disposition" contains "spenicle-"
    And the export JSON matches the snapshot "get_api_export__an_empty_ledger_leaves_with_the_accounts_it_started_with"

  @vendors
  Scenario: Everything the ledger holds leaves in one document
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan","default_account_ref":"{{account:Cash}}"}
      """
    Then the response status is 201
    And the last ref is remembered as "payee"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"flat white","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"a receipt that stays sealed"}
      """
    Then the response status is 202
    When I send a POST to "/api/recurring" with:
      """json
      {"payee_ref":"{{ref:payee}}","account_ref":"{{account:Cash}}","category_ref":"{{account:Unsorted}}","amount_minor":"25000","currency":"IDR","cadence":"monthly","interval_n":1,"day_of_month":20,"next_due_on":"2026-12-20"}
      """
    Then the response status is 201
    When I send a POST to "/api/analytics/custom" with:
      """json
      {"name":"Spend per month","namespace":"months","chart":"bar"}
      """
    Then the response status is 201
    When I send a GET to "/api/export"
    Then the response status is 200
    And the export JSON matches the snapshot "get_api_export__everything_the_ledger_holds_leaves_in_one_document"

  Scenario: The csv format is a zip of sheets and a manifest
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    When I send a GET to "/api/export" with headers/query:
      | type  | key    | value |
      | query | format | csv   |
    Then the response status is 200
    And the response header "Content-Type" is "application/zip"
    And the response header "Content-Disposition" contains ".zip"
    And the export archive holds "accounts.csv,payees.csv,entries.csv,postings.csv,captures.csv,rates.csv,recurring.csv,custom_queries.csv,manifest.json"
    And the export manifest reports "entries.csv" rows "1"
    And the export manifest reports "postings.csv" rows "2"

  Scenario: An unknown format is refused
    Given a running API
    When I send a GET to "/api/export" with headers/query:
      | type  | key    | value |
      | query | format | xml   |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_export__an_unknown_format_is_refused"
