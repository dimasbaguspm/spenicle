Feature: Ledger listing and voiding
  The ledger is append-only: an entry is voided by posting its reversal, never by
  deleting a row.

  Scenario: Listing returns the newest entry first
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"first","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"second","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2000"}]}
      """
    When I send a GET to "/api/entries"
    Then the response status is 200
    And the response JSON at "$.entries[0].note" is "second"
    And the response JSON at "$.entries[1].note" is "first"

  Scenario: The date range narrows the listing
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-01-31","currency":"IDR","note":"january","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-100"},{"account_ref":"{{account:Unsorted}}","amount_minor":"100"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-15","currency":"IDR","note":"february","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-200"},{"account_ref":"{{account:Unsorted}}","amount_minor":"200"}]}
      """
    When I send a GET to "/api/entries?from=2026-02-01&to=2026-02-28"
    Then the response status is 200
    And the response JSON at "$.entries[0].note" is "february"
    And the store holds:
      | table          | count |
      | ledger_entries | 2     |

  Scenario: Voiding writes a reversal and keeps the original
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"duplicate","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"void":true,"reason":"duplicate of 811"}
      """
    Then the response status is 200
    And the response JSON at "$.source" is "adjustment"
    And the response JSON at "$.note" is "duplicate of 811"
    And the response JSON at "$.postings[0].amount_minor" is "15000"
    And the store holds:
      | table           | count |
      | ledger_entries  | 2     |
      | ledger_postings | 4     |

  Scenario: An entry cannot be voided twice
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    And I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"void":true,"reason":"first"}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"void":true,"reason":"again"}
      """
    Then the response status is 409
    And the response JSON at "$.error.code" is "invalid_state"

  Scenario: Voiding something that is not there answers 404
    Given a running API
    When I send a PATCH to "/api/entries/00000000000000000000000000000000" with:
      """json
      {"void":true,"reason":"nothing"}
      """
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
