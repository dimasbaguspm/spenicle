Feature: PATCH /api/captures/{{ref}}
  One file per route: every scenario here calls PATCH /api/captures/{{ref}}.

  Scenario: Approving a capture posts the entry and resolves the queue item
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-13","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-100"},{"account_ref":"{{account:Unsorted}}","amount_minor":"100"}]}
      """
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"email","raw_text":"KOPI KENANGAN Rp25.000"}
      """
    Then the response status is 202
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "patch_api_captures_:ref__approving_a_capture_posts_the_entry_and_resolves_the_queue_item"
    And the store holds:
      | table           | count |
      | ledger_entries  | 2     |
      | ledger_postings | 4     |

  Scenario: An approved capture cannot be approved twice
    Given a running API
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"manual","raw_text":"typed by hand"}
      """
    And I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    Then the response status is 201
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-15","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_captures_:ref__an_approved_capture_cannot_be_approved_twice"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: Rejecting a capture never touches the ledger
    Given a running API
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"not my card"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"reject","reason":"wrong card"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_captures_:ref__rejecting_a_capture_never_touches_the_ledger"
    And the store holds:
      | table    | count |
      | captures | 1     |
      | ledger_entries | 0 |
