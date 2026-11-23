Feature: GET /api/entries
  One file per route: every scenario here calls GET /api/entries.

  Scenario Outline: The ledger listing honours its range
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-01-31","currency":"IDR","note":"january","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-100"},{"account_ref":"{{account:Unsorted}}","amount_minor":"100"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-15","currency":"IDR","note":"february","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-200"},{"account_ref":"{{account:Unsorted}}","amount_minor":"200"}]}
      """
    When I send a GET to "/api/entries" with headers/query:
      | type  | key  | value      |
      | query | from | <from>     |
      | query | to   | <to>       |
      | query | limit | <limit>   |
    Then the response status is 200
    And the response JSON at "$.entries[0].note" is "<newest>"
    And the response JSON is contract-clean

    Examples:
      | from       | to         | limit | newest   |
      | 2026-02-01 | 2026-02-28 | 50    | february |
      | 2026-01-01 | 2026-01-31 | 50    | january  |
      | 2026-01-01 | 2026-12-31 | 1     | february |

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
