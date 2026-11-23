Feature: GET /api/captures
  One file per route: every scenario here calls GET /api/captures.

  Scenario: A share capture waits in the queue
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"BCA: Transaksi Rp25.000 di KOPI KENANGAN"}
      """
    Then the response status is 202
    And the response JSON matches the snapshot "get_api_captures__a_share_capture_waits_in_the_queue"
    When I send a GET to "/api/captures"
    Then the response status is 200
    And the store holds:
      | table    | count |
      | captures | 1     |
      | ledger_entries | 0 |
