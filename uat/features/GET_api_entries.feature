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
      | entries | 2     |

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
      | entries | 0     |

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

  Scenario: The payee filter narrows the listing
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","payee_ref":"{{ref}}","note":"kopi","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And I send a POST to "/api/payees" with:
      """json
      {"name":"INDOMARET"}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","payee_ref":"{{ref}}","note":"indomaret","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-22000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"22000"}]}
      """
    When I send a GET to "/api/entries?payee_ref={{ref:kopi}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_payee_filter_narrows_the_listing"
    And the store holds:
      | table          | count |
      | entries | 2     |

  Scenario: The amount floor drops the small ones
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"coffee","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"rent","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2200000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2200000"}]}
      """
    When I send a GET to "/api/entries?amount_min=100000"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_amount_floor_drops_the_small_ones"

  Scenario: One exact amount finds its entry
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"coffee","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"rent","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2200000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2200000"}]}
      """
    When I send a GET to "/api/entries?amount_min=1500&amount_max=1500"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__one_exact_amount_finds_its_entry"

  Scenario: The query reaches the payee name, not only the note
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","payee_ref":"{{ref:kopi}}","note":"morning","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"groceries","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-42000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"42000"}]}
      """
    When I send a GET to "/api/entries?query=kenangan"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_query_reaches_the_payee_name"

  Scenario: Several payees answer in one listing
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/payees" with:
      """json
      {"name":"INDOMARET"}
      """
    And the last ref is remembered as "indomaret"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","payee_ref":"{{ref:kopi}}","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","payee_ref":"{{ref:indomaret}}","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-22000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"22000"}]}
      """
    When I send a GET to "/api/entries?payee_ref={{ref:kopi}},{{ref:indomaret}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__several_payees_answer_in_one_listing"

  Scenario: Several accounts answer in one listing
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    When I send a GET to "/api/entries?account_ref={{account:Cash}},00000000000000000000000000000000"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__several_accounts_answer_in_one_listing"

  Scenario: Several sources answer in one listing
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"duplicate","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    And I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reverse":true,"reason":"duplicate of 811"}
      """
    When I send a GET to "/api/entries?source=manual,adjustment"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__several_sources_answer_in_one_listing"

  Scenario: The reversed flag asks for what was reversed
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"reversed","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And the last ref is remembered as "reversed"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"live","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2200"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2200"}]}
      """
    And I send a PATCH to "/api/entries/{{ref:reversed}}" with:
      """json
      {"reverse":true,"reason":"wrong amount"}
      """
    When I send a GET to "/api/entries?reversed=true"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_reversed_flag_asks_for_what_was_reversed"

  Scenario: The live flag drops what was reversed
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"reversed","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And the last ref is remembered as "reversed"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"live","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2200"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2200"}]}
      """
    And I send a PATCH to "/api/entries/{{ref:reversed}}" with:
      """json
      {"reverse":true,"reason":"wrong amount"}
      """
    When I send a GET to "/api/entries?reversed=false"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_live_flag_drops_what_was_reversed"

  Scenario Outline: A malformed listing filter is refused
    Given a running API
    When I send a GET to "/api/entries?<filter>=<value>"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_entries__a_malformed_listing_filter_is_refused_{{bodyhash}}"

    Examples:
      | filter      | value |
      | amount_min  | abc   |
      | account_ref | zzz   |
      | source      | nope  |
      | reversed      | maybe |
      | with_balance | maybe |

  Scenario: The running balance walks the one account the filter names
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"first","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-02","currency":"IDR","note":"second","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2000"}]}
      """
    When I send a GET to "/api/entries?account_ref={{account:Cash}}&with_balance=true"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_running_balance_walks_the_one_account_the_filter_names"

  Scenario: The balance stays out when the filter names two accounts
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","note":"first","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1000"}]}
      """
    When I send a GET to "/api/entries?account_ref={{account:Cash}},{{account:Unsorted}}&with_balance=true"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries__the_balance_stays_out_when_the_filter_names_two_accounts"

