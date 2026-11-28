Feature: PATCH /api/entries/{{ref}}
  One file per route: every scenario here calls PATCH /api/entries/{{ref}}.

  Scenario: Reversing writes a reversal and keeps the original
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"duplicate","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reverse":true,"reason":"duplicate of 811"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_entries_:ref__reversing_writes_a_reversal_and_keeps_the_original"
    And the store holds:
      | table           | count |
      | entries  | 2     |
      | postings | 4     |
    And the database matches the snapshot "patch_api_entries_:ref__reversing_writes_a_reversal_and_keeps_the_original"

  Scenario: An entry cannot be reversed twice
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    And I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reverse":true,"reason":"first"}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reverse":true,"reason":"again"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_entries_:ref__an_entry_cannot_be_reversed_twice"

  Scenario: Reversing something that is not there answers 404
    Given a running API
    When I send a PATCH to "/api/entries/00000000000000000000000000000000" with:
      """json
      {"reverse":true,"reason":"nothing"}
      """
    Then the response status is 404
    And the response JSON matches the snapshot "patch_api_entries_:ref__reversing_something_that_is_not_there_answers_404"

  Scenario: A payee can be set on an existing entry
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"unassigned","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the last ref is remembered as "entry"
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    When I send a PATCH to "/api/entries/{{ref:entry}}" with:
      """json
      {"payee_ref":"{{ref}}"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_payee_can_be_set_on_an_existing_entry"
    And the store holds:
      | table          | count |
      | entries | 1     |
    And the journal holds 2 "ledger_entry" rows
    And the journal holds 1 "payee" rows

  Scenario: A payee can be cleared again
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"unassigned","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the last ref is remembered as "entry"
    And I send a POST to "/api/payees" with:
      """json
      {"name":"KOPI KENANGAN"}
      """
    And I send a PATCH to "/api/entries/{{ref:entry}}" with:
      """json
      {"payee_ref":"{{ref}}"}
      """
    When I send a PATCH to "/api/entries/{{ref:entry}}" with:
      """json
      {"payee_ref":""}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_payee_can_be_cleared_again"
    And the store holds:
      | table          | count |
      | entries | 1     |
    And the journal holds 3 "ledger_entry" rows
    And the journal holds 1 "payee" rows

  Scenario: A patch that asks for nothing is refused
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the last ref is remembered as "entry"
    When I send a PATCH to "/api/entries/{{ref:entry}}" with:
      """json
      {"reason":"nothing to do"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_patch_that_asks_for_nothing_is_refused"

  Scenario: Correcting the amount reverses the original and posts the replacement
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"coffee","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reason":"wrong amount","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-20000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"20000"}]}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_entries_:ref__correcting_the_amount_reverses_the_original_and_posts_the_replacement"
    And the store holds:
      | table          | count |
      | entries | 3     |

  Scenario: Amending only the note keeps the entry in place
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"coffee","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"note":"coffee and a bun"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_entries_:ref__amending_only_the_note_keeps_the_entry_in_place"
    And the store holds:
      | table   | count |
      | entries | 1     |

  Scenario: A correction and a reversal do not travel together
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"reverse":true,"note":"both","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_correction_and_a_reversal_do_not_travel_together"

  Scenario: A correction on a reversed entry is refused
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the last ref is remembered as "original"
    And I send a PATCH to "/api/entries/{{ref:original}}" with:
      """json
      {"reverse":true,"reason":"duplicate"}
      """
    When I send a PATCH to "/api/entries/{{ref:original}}" with:
      """json
      {"note":"too late"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_correction_on_a_reversed_entry_is_refused"
