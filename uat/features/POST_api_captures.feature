Feature: POST /api/captures
  One file per route: every scenario here calls POST /api/captures.

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
    And the store holds:
      | table    | count |
      | captures | 1     |

  Scenario: An unknown capture kind is refused
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"telepathy","raw_text":"hi"}
      """
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_capture_kind"
    And the response JSON is contract-clean

  Scenario: A capture and its approval are snapshotted
    Given a running API
    And the request body is:
      """json
      {"kind":"share","raw_text":"BCA: Transaksi Rp25.000 di KOPI KENANGAN"}
      """
    When I send a POST to "/api/captures" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 202
    And the response JSON matches the snapshot "capture_pending"
    And the database matches the snapshot "capture_pending"

  Scenario Outline: Every capture kind is accepted
    Given a running API
    And the request body is:
      """json
      {"kind":"<kind>","raw_text":"<kind> capture"}
      """
    When I send a POST to "/api/captures" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 202
    And the response JSON at "$.status" is "pending"
    And the response JSON at "$.kind" is "<kind>"

    Examples:
      | kind      |
      | share     |
      | image     |
      | email     |
      | statement |
      | recurring |
      | manual    |

  Scenario Outline: An unusable capture answers with a stable error code
    Given a running API
    And the request body is:
      """json
      {"kind":"<kind>","raw_text":"x"}
      """
    When I send a POST to "/api/captures" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is <status>
    And the response JSON at "$.error.code" is "<code>"

    Examples:
      | kind     | status | code                 |
      | telepathy | 422   | unknown_capture_kind |
      |           | 422   | unknown_capture_kind |
