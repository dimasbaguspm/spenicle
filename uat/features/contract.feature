Feature: Contract
  The parts of the wire that must not drift: exact JSON bodies, exact database rows,
  every accepted capture kind, and the error codes a client branches on.

  Scenario: A posted entry is captured in both snapshots
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","note":"snapshotted","postings":[{"account_id":2,"amount_minor":"25000"},{"account_id":1,"amount_minor":"-25000"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
      | header | X-Request-Id | uat-contract-1   |
      | query  | trace        | 1                |
    Then the response status is 201
    And the response JSON matches the snapshot "entry_created"
    And the database matches the snapshot "entry_created"

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

  Scenario Outline: An unusable entry answers with a stable error code
    Given a running API
    And the request body is:
      """json
      <body>
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is <status>
    And the response JSON at "$.error.code" is "<code>"

    Examples:
      | body                                                                                                                                                        | status | code                  |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"2"}]}                            | 422    | postings_not_balanced |
      | {"occurred_on":"2026-02-14","currency":"XXX","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"1"}]}                            | 422    | unknown_currency      |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":1,"amount_minor":"0"}]}                                                                | 422    | invalid_postings      |
      | {"currency":"IDR","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"1"}]}                                                       | 422    | invalid_request       |
      | {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":1,"amount_minor":"nope"},{"account_id":2,"amount_minor":"1"}]}                          | 422    | invalid_request       |
      | {"occurred_on":"14-02-2026","currency":"IDR","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"1"}]}                            | 422    | invalid_request       |
      | {"occurred_on":                                                                                                                                              | 400    | invalid_json          |

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

  Scenario Outline: The ledger listing honours its range
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-01-31","currency":"IDR","note":"january","postings":[{"account_id":1,"amount_minor":"-100"},{"account_id":2,"amount_minor":"100"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-15","currency":"IDR","note":"february","postings":[{"account_id":1,"amount_minor":"-200"},{"account_id":2,"amount_minor":"200"}]}
      """
    When I send a GET to "/api/entries" with headers/query:
      | type  | key  | value      |
      | query | from | <from>     |
      | query | to   | <to>       |
      | query | limit | <limit>   |
    Then the response status is 200
    And the response JSON at "$.entries[0].note" is "<newest>"

    Examples:
      | from       | to         | limit | newest   |
      | 2026-02-01 | 2026-02-28 | 50    | february |
      | 2026-01-01 | 2026-01-31 | 50    | january  |
      | 2026-01-01 | 2026-12-31 | 1     | february |
