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
    And the response JSON at "$.error.code" is "<code>"
    And the response JSON is contract-clean

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
    And the response JSON at "$.currency" is "IDR"
    And the response JSON at "$.source" is "share"
    And the response JSON at "$.postings[0].base_amount_minor" is "25000"
    And the response JSON at "$.postings[0].fx_source" is "identity"
    And the store holds:
      | table           | count |
      | ledger_entries  | 1     |
      | ledger_postings | 2     |
      | audit_log       | 1     |

  Scenario: Replaying a client id returns the stored entry instead of a duplicate
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"
    When I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_ref":"{{account:Coffee}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 200
    And the store holds:
      | table           | count |
      | ledger_entries  | 1     |
      | ledger_postings | 2     |

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
    And the response JSON at "$.error.code" is "postings_not_balanced"
    And the response JSON at "$.error.message" contains "do not sum to zero"
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
    And the response JSON at "$.error.code" is "invalid_postings"

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
    And the response JSON at "$.error.code" is "invalid_rate"
    And the response JSON at "$.error.message" contains "rate required for USD to IDR"

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
    And the response JSON at "$.currency" is "USD"
    And the response JSON at "$.postings[0].amount_minor" is "800"
    And the response JSON at "$.postings[0].base_amount_minor" is "130003"
    And the response JSON at "$.postings[0].fx_rate" is "16250.42"
    And the response JSON at "$.postings[0].fx_source" is "manual"

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
    And the response JSON at "$.error.code" is "unknown_currency"

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
    And the response JSON at "$.occurred_on" is "2024-01-31"
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
    And the response JSON at "$.error.code" is "invalid_request"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: A mutating request from another origin is refused
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value                |
      | header | Origin       | https://evil.example |
      | header | Content-Type | application/json     |
    Then the response status is 403
    And the response JSON at "$.error.code" is "cross_origin_denied"

  Scenario: A request without an Origin header is allowed
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201

  Scenario: An unknown field is refused instead of ignored
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1","fx_rte":"1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    Then the response status is 400
    And the response JSON at "$.error.code" is "invalid_json"
    And the response JSON at "$.error.message" contains "unknown field"
