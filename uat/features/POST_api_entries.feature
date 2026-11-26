Feature: POST /api/entries
  One file per route: every scenario here calls POST /api/entries.

  Scenario: A posted entry is captured in both snapshots
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"snapshotted","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
      | header | X-Request-Id | uat-contract-1   |
      | query  | trace        | 1                |
    Then the response status is 201
    And the response JSON matches the snapshot "entry_created"
    And the database matches the snapshot "entry_created"

  Scenario Outline: An unusable entry answers with a stable error code
    Given a running API
    And the request body is:
      """json
      <body>
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is <status>
    And the response JSON matches the snapshot "post_api_entries__an_unusable_entry_answers_with_a_stable_error_code_{{bodyhash}}"

    Examples:
      | body                                                                                                                                                        | status | code                  |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2"}]}                            | 422    | postings_not_balanced |
      | {"occurred_on":"2026-02-14","currency":"XXX","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}                            | 422    | unknown_currency      |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"0"}]}                                                                | 422    | invalid_postings      |
      | {"currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}                                                       | 422    | invalid_request       |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"nope"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}                          | 422    | invalid_request       |
      | {"occurred_on":"14-02-2026","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}                            | 422    | invalid_request       |
      | {"occurred_on":                                                                                                                                              | 400    | invalid_json          |

  Scenario: A balanced expense is accepted and stored once
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-balanced","occurred_on":"2025-09-14","currency":"IDR","source":"share","note":"flat white","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_balanced_expense_is_accepted_and_stored_once"
    And the store holds:
      | table           | count |
      | ledger_entries  | 1     |
      | ledger_postings | 2     |
    And the journal holds 1 "ledger_entry" rows

  Scenario: Replaying a client id returns the stored entry instead of a duplicate
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    And the last ref is remembered as "entry"
    And I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 200
    And the last ref is still "entry"
    And the store holds:
      | table           | count |
      | ledger_entries  | 1     |
      | ledger_postings | 2     |
    And the response JSON matches the snapshot "post_api_entries__replaying_a_client_id_returns_the_stored_entry"

  Scenario: Postings that do not balance are refused
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-24000"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__postings_that_do_not_balance_are_refused"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: A single posting is refused
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"0"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__a_single_posting_is_refused"

  Scenario: A foreign amount without a rate is refused rather than guessed
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"USD","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"800"},{"account_ref":"{{account:Cash}}","amount_minor":"-800"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__a_foreign_amount_without_a_rate_is_refused_rather_than_guessed"

  Scenario: A foreign amount with a rate is converted once
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"USD","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"800","fx_rate":"16250.42"},{"account_ref":"{{account:Cash}}","amount_minor":"-800","fx_rate":"16250.42"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_foreign_amount_with_a_rate_is_converted_once"

  @vendors
  Scenario: A foreign entry takes the sheet's rate for its own day
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-11-20","currency":"EUR","note":"oom","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"1000"},{"account_ref":"{{account:Cash}}","amount_minor":"-1000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_foreign_entry_takes_the_sheets_rate_for_its_own_day"

  @vendors
  Scenario: A carried day and a cross rate still convert a foreign entry
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-11-21","currency":"USD","note":"abroad","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"1000"},{"account_ref":"{{account:Cash}}","amount_minor":"-1000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_carried_day_and_a_cross_rate_still_convert_a_foreign_entry"

  Scenario: An unknown currency is refused
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"XXX","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__an_unknown_currency_is_refused"

  Scenario: A late entry in a past month is accepted
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2024-01-31","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"15000"},{"account_ref":"{{account:Cash}}","amount_minor":"-15000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_late_entry_in_a_past_month_is_accepted"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: A malformed amount is refused before it reaches the ledger
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25.000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25.000"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__a_malformed_amount_is_refused_before_it_reaches_the_ledger"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: An unknown field is refused instead of ignored
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1","fx_rte":"1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    Then the response status is 400
    And the response JSON matches the snapshot "post_api_entries__an_unknown_field_is_refused_instead_of_ignored"

  Scenario: A broken database connection answers 500
    Given a running API
    And the connection is broken
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-04-01","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-100"},{"account_ref":"{{account:Unsorted}}","amount_minor":"100"}]}
      """
    Then the response status is 500
    And the response JSON matches the snapshot "post_api_entries__a_broken_database_connection_answers_500"
    And the failure is logged

  Scenario: A posted entry carries its payee in the response
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","payee_ref":"{{ref}}","note":"kopi","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_entries__a_posted_entry_carries_its_payee_in_the_response"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |
    And the journal holds 1 "ledger_entry" rows
    And the journal holds 1 "payee" rows

  Scenario: An unknown payee is refused
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","payee_ref":"00000000000000000000000000000000","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_entries__an_unknown_payee_is_refused"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: A malformed payee ref is refused
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","payee_ref":"kopi","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_entries__a_malformed_payee_ref_is_refused"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |
