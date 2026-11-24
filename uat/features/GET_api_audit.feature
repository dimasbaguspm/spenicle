Feature: GET /api/audit
  One file per route: every scenario here calls GET /api/audit. The journal is
  append-only and filtered by kind, ref, action, actor and a day range.

  Scenario: The journal lists what changed, newest first
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","payee_ref":"{{ref}}","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/audit"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_audit__the_journal_lists_what_changed"

  Scenario: The kind filter narrows the journal to one table
    Given a running API
    When I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    Then the response status is 201
    When the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/audit" with headers/query:
      | type  | key         | value        |
      | query | entity_kind | ledger_entry |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_audit__the_kind_filter_keeps_the_ledger_rows"
    And the journal holds 1 "ledger_entry" rows

  Scenario: An unknown kind is refused before the query runs
    Given a running API
    When I send a GET to "/api/audit" with headers/query:
      | type  | key         | value |
      | query | entity_kind | nope  |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_audit__an_unknown_kind_is_refused"
