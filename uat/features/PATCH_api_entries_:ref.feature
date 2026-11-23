Feature: PATCH /api/entries/{{ref}}
  One file per route: every scenario here calls PATCH /api/entries/{{ref}}.

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
