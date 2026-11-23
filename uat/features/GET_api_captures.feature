Feature: GET /api/captures
  One file per route: every scenario here calls GET /api/captures.

  Scenario: A share capture waits in the queue
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"BCA: Transaksi Rp25.000 di KOPI KENANGAN"}
      """
    Then the response status is 202
    And the response JSON at "$.status" is "pending"
    And the response JSON is contract-clean
    And the response JSON at "$.raw_text" is "BCA: Transaksi Rp25.000 di KOPI KENANGAN"
    When I send a GET to "/api/captures"
    Then the response status is 200
    And the response JSON at "$.captures[0].status" is "pending"
    And the response JSON at "$.captures[0].raw_text" contains "KOPI KENANGAN"
    And the store holds:
      | table    | count |
      | captures | 1     |
      | ledger_entries | 0 |
