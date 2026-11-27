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
    And the response JSON matches the snapshot "patch_api_entries_:ref__voiding_writes_a_reversal_and_keeps_the_original"
    And the store holds:
      | table           | count |
      | ledger_entries  | 2     |
      | ledger_postings | 4     |
    And the database matches the snapshot "patch_api_entries_:ref__voiding_writes_a_reversal_and_keeps_the_original"

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
    And the response JSON matches the snapshot "patch_api_entries_:ref__an_entry_cannot_be_voided_twice"

  Scenario: Voiding something that is not there answers 404
    Given a running API
    When I send a PATCH to "/api/entries/00000000000000000000000000000000" with:
      """json
      {"void":true,"reason":"nothing"}
      """
    Then the response status is 404
    And the response JSON matches the snapshot "patch_api_entries_:ref__voiding_something_that_is_not_there_answers_404"

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
      | ledger_entries | 1     |
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
      | ledger_entries | 1     |
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

  Scenario: Correcting the amount voids the original and posts the replacement
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
    And the response JSON matches the snapshot "patch_api_entries_:ref__correcting_the_amount_voids_the_original_and_posts_the_replacement"
    And the store holds:
      | table          | count |
      | ledger_entries | 3     |

  Scenario: Correcting only the note keeps the money
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
    And the response JSON matches the snapshot "patch_api_entries_:ref__correcting_only_the_note_keeps_the_money"

  Scenario: A correction and a void do not travel together
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    When I send a PATCH to "/api/entries/{{ref}}" with:
      """json
      {"void":true,"note":"both","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1"}]}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_correction_and_a_void_do_not_travel_together"

  Scenario: A correction on a voided entry is refused
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    And the last ref is remembered as "original"
    And I send a PATCH to "/api/entries/{{ref:original}}" with:
      """json
      {"void":true,"reason":"duplicate"}
      """
    When I send a PATCH to "/api/entries/{{ref:original}}" with:
      """json
      {"note":"too late"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_entries_:ref__a_correction_on_a_voided_entry_is_refused"
