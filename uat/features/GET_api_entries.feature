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
    And the response JSON matches the snapshot "get_api_entries__the_ledger_listing_honours_its_range_{{bodyhash}}"

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
    And the response JSON matches the snapshot "get_api_entries__listing_returns_the_newest_entry_first"

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
    And the response JSON matches the snapshot "get_api_entries__the_date_range_narrows_the_listing"
    And the store holds:
      | table          | count |
      | ledger_entries | 2     |

  Scenario: Clearing the database leaves an empty listing
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-03-01","currency":"IDR","note":"wiped","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"500"}]}
      """
    And the response status is 201
    But the database is cleared
    When I send a GET to "/api/entries"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__clearing_the_database_leaves_an_empty_listing"
    And the store holds:
      | table          | count |
      | ledger_entries | 0     |

  Scenario: The currency filter narrows the listing
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"kopi","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And the response status is 201
    When I send a GET to "/api/entries?currency=USD"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_currency_filter_narrows_the_listing"
