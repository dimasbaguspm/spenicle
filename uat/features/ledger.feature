Feature: Ledger
  The ledger records money movements as postings that sum to zero and are never
  edited in place. Every row is provenance, so nothing is deleted.

  Background:
    Given the base currency is "IDR"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Coffee" exists as "expense"

  Scenario: A balanced expense is accepted and stored once
    When I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-balanced","occurred_on":"2025-09-14","currency":"IDR","source":"share","note":"flat white","postings":[{"account_id":{{account:Coffee}},"amount_minor":"25000"},{"account_id":{{account:Cash}},"amount_minor":"-25000"}]}
      """
    Then the response status is 201
    And the response JSON at "$.id" is "1"
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
    When I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"25000"},{"account_id":{{account:Cash}},"amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"client_id":"bdd-replay","occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"25000"},{"account_id":{{account:Cash}},"amount_minor":"-25000"}]}
      """
    Then the response status is 200
    And the store holds:
      | table           | count |
      | ledger_entries  | 1     |
      | ledger_postings | 2     |

  Scenario: Postings that do not balance are refused
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"25000"},{"account_id":{{account:Cash}},"amount_minor":"-24000"}]}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "postings_not_balanced"
    And the response JSON at "$.error.message" contains "do not sum to zero"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: A single posting is refused
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"0"}]}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_postings"

  Scenario: A foreign amount without a rate is refused rather than guessed
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"USD","postings":[{"account_id":{{account:Coffee}},"amount_minor":"800"},{"account_id":{{account:Cash}},"amount_minor":"-800"}]}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_rate"
    And the response JSON at "$.error.message" contains "rate required for USD to IDR"

  Scenario: A foreign amount with a rate is converted once
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"USD","postings":[{"account_id":{{account:Coffee}},"amount_minor":"800","fx_rate":"16250.42"},{"account_id":{{account:Cash}},"amount_minor":"-800","fx_rate":"16250.42"}]}
      """
    Then the response status is 201
    And the response JSON at "$.currency" is "USD"
    And the response JSON at "$.postings[0].amount_minor" is "800"
    And the response JSON at "$.postings[0].base_amount_minor" is "130003"
    And the response JSON at "$.postings[0].fx_rate" is "16250.42"
    And the response JSON at "$.postings[0].fx_source" is "manual"

  Scenario: An unknown currency is refused
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"XXX","postings":[{"account_id":{{account:Coffee}},"amount_minor":"100"},{"account_id":{{account:Cash}},"amount_minor":"-100"}]}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_currency"

  Scenario: A late entry in a past month is accepted
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2024-01-31","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"15000"},{"account_id":{{account:Cash}},"amount_minor":"-15000"}]}
      """
    Then the response status is 201
    And the response JSON at "$.occurred_on" is "2024-01-31"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: A malformed amount is refused before it reaches the ledger
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"IDR","postings":[{"account_id":{{account:Coffee}},"amount_minor":"25.000"},{"account_id":{{account:Cash}},"amount_minor":"-25.000"}]}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "invalid_request"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |
