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

  Scenario: Approving a capture with a payee ref attaches the payee
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"KOPI KENANGAN 18.000"}
      """
    And the last ref is remembered as "receipt"
    When I send a PATCH to "/api/captures/{{ref:receipt}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","payee_ref":"{{ref:kopi}}","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"},{"account_ref":"{{account:Cash}}","amount_minor":"-18000"}]}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "patch_api_captures_:ref__approving_a_capture_with_a_payee_ref_attaches_the_payee"

  Scenario: An approve body with an integer payee id is refused
    Given a running API
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"manual","raw_text":"typed by hand"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","payee_id":1,"postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    Then the response status is 400
    And the response JSON matches the snapshot "patch_api_captures_:ref__an_approve_body_with_an_integer_payee_id_is_refused"

  Scenario: Matching a capture resolves it without touching the ledger
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-13","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-25000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"}]}
      """
    And the last ref is remembered as "entry"
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"KOPI 25.000 already logged"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"match","entry_ref":"{{ref:entry}}"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_captures_:ref__matching_a_capture_resolves_it_without_touching_the_ledger"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |
      | captures       | 1     |

  Scenario: A match without an entry ref is refused
    Given a running API
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"no entry named"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"match"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "patch_api_captures_:ref__a_match_without_an_entry_ref_is_refused"

  Scenario: Approving a capture remembers the payee's category
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"Kopi Kenangan"}
      """
    And the last ref is remembered as "kopi"
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"KOPI KENANGAN 18.000"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","payee_ref":"{{ref:kopi}}","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
      """
    Then the response status is 201
    When I send a GET to "/api/payees?refs={{ref:kopi}}"
    Then the response JSON matches the snapshot "patch_api_captures_:ref__approving_a_capture_remembers_the_payees_category"

  Scenario: Learning can be turned off for one approval
    Given a running API
    And I send a POST to "/api/payees" with:
      """json
      {"name":"Warung Bu Tini"}
      """
    And the last ref is remembered as "warung"
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"WARUNG 12.000"}
      """
    When I send a PATCH to "/api/captures/{{ref}}" with:
      """json
      {"action":"approve","learn":false,"occurred_on":"2026-02-14","currency":"IDR","payee_ref":"{{ref:warung}}","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-12000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"12000"}]}
      """
    Then the response status is 201
    When I send a GET to "/api/payees?refs={{ref:warung}}"
    Then the response JSON matches the snapshot "patch_api_captures_:ref__learning_can_be_turned_off_for_one_approval"
