Feature: Captures
  A capture is anything unconfirmed: share text, a photo, an email. It never writes
  to the ledger on its own; only an approval does.

  Scenario: A share capture waits in the queue
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"BCA: Transaksi Rp25.000 di KOPI KENANGAN"}
      """
    Then the response status is 202
    And the response JSON at "$.status" is "pending"
    And the response JSON at "$.raw_text" is "BCA: Transaksi Rp25.000 di KOPI KENANGAN"
    And the response JSON at "$.id" is "1"
    When I send a GET to "/api/captures"
    Then the response status is 200
    And the response JSON at "$.captures[0].status" is "pending"
    And the response JSON at "$.captures[0].raw_text" contains "KOPI KENANGAN"
    And the store holds:
      | table    | count |
      | captures | 1     |
      | ledger_entries | 0 |

  Scenario: The same payload twice stays one queue item
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"same receipt"}
      """
    Then the response status is 202
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"same receipt"}
      """
    Then the response status is 200
    And the response JSON at "$.id" is "1"
    And the store holds:
      | table    | count |
      | captures | 1     |

  Scenario: Approving a capture posts the entry and resolves the queue item
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-13","currency":"IDR","postings":[{"account_id":1,"amount_minor":"-100"},{"account_id":2,"amount_minor":"100"}]}
      """
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"email","raw_text":"KOPI KENANGAN Rp25.000"}
      """
    Then the response status is 202
    When I send a PATCH to "/api/captures/1" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":2,"amount_minor":"25000"},{"account_id":1,"amount_minor":"-25000"}]}
      """
    Then the response status is 201
    And the response JSON at "$.entry.source" is "email"
    And the response JSON at "$.entry.postings[0].base_amount_minor" is "25000"
    And the response JSON at "$.capture.status" is "approved"
    And the response JSON at "$.capture.resolved_entry_id" is "2"
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
    And I send a PATCH to "/api/captures/1" with:
      """json
      {"action":"approve","occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":2,"amount_minor":"100"},{"account_id":1,"amount_minor":"-100"}]}
      """
    Then the response status is 201
    When I send a PATCH to "/api/captures/1" with:
      """json
      {"action":"approve","occurred_on":"2026-02-15","currency":"IDR","postings":[{"account_id":2,"amount_minor":"100"},{"account_id":1,"amount_minor":"-100"}]}
      """
    Then the response status is 409
    And the response JSON at "$.error.code" is "capture_resolved"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: Rejecting a capture never touches the ledger
    Given a running API
    And I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"not my card"}
      """
    When I send a PATCH to "/api/captures/1" with:
      """json
      {"action":"reject","reason":"wrong card"}
      """
    Then the response status is 200
    And the response JSON at "$.status" is "rejected"
    And the response JSON at "$.resolution_note" is "wrong card"
    And the store holds:
      | table    | count |
      | captures | 1     |
      | ledger_entries | 0 |

  Scenario: An unknown capture kind is refused
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"telepathy","raw_text":"hi"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_capture_kind"
