Feature: GET /api/entries/{{ref}}
  One file per route: every scenario here calls the single entry route.

  Scenario: One entry comes back by ref
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","payee_ref":"{{ref:kopi}}","note":"kopi","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the response status is 201
    And the last ref is remembered as "entry"
    When I send a GET to "/api/entries/{{ref:entry}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries_ref__one_entry_comes_back_by_ref"
    And the store holds:
      | table           | count |
      | entries  | 1     |
      | postings | 2     |

  Scenario: An unknown entry is not found
    Given a running API
    When I send a GET to "/api/entries/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_entries_ref__an_unknown_entry_is_not_found"

  Scenario: A malformed ref is refused
    Given a running API
    When I send a GET to "/api/entries/not-a-ref"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_entries_ref__a_malformed_ref_is_refused"

  Scenario: A reversed entry still comes back, carrying its reversed timestamp
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"duplicate","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    And the last ref is remembered as "entry"
    And I send a PATCH to "/api/entries/{{ref:entry}}" with:
      """json
      {"reverse":true,"reason":"duplicate of 811"}
      """
    When I send a GET to "/api/entries/{{ref:entry}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_entries_ref__a_reversed_entry_carries_its_reversed_timestamp"
    And the store holds:
      | table          | count |
      | entries | 2     |
