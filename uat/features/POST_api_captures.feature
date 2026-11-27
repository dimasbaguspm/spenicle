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
    And the response JSON matches the snapshot "post_api_captures__the_same_payload_twice_stays_one_queue_item"
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
    And the response JSON matches the snapshot "post_api_captures__an_unknown_capture_kind_is_refused"

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
    And the response JSON matches the snapshot "post_api_captures__every_capture_kind_is_accepted_{{bodyhash}}"

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
    And the response JSON matches the snapshot "post_api_captures__an_unusable_capture_answers_with_a_stable_error_code_{{bodyhash}}"

    Examples:
      | kind     | status | code                 |
      | telepathy | 422   | unknown_capture_kind |
      |           | 422   | unknown_capture_kind |

  @vendors
  Scenario: SnapToJSON reads the receipt while the vendor is up
    Given the extraction rail is "snaptojson"
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__snaptojson_reads_the_receipt_while_the_vendor_is_up"

  @vendors
  Scenario: The SnapToJSON vendor is down and the capture is kept
    Given the extraction rail is "snaptojson"
    And the extraction vendor is down
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__the_snaptojson_vendor_is_down_and_the_capture_is_kept"
    And the database matches the snapshot "capture_vendor_down"
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | entries | 0     |

  @vendors
  Scenario: OpenAI reads the receipt while the vendor is up
    Given the extraction rail is "openai"
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__openai_reads_the_receipt_while_the_vendor_is_up"

  @vendors
  Scenario: The OpenAI vendor is down and the capture is kept
    Given the extraction rail is "openai"
    And the extraction vendor is down
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__the_openai_vendor_is_down_and_the_capture_is_kept"
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | entries | 0     |

  @vendors
  Scenario: SnapToJSON breaks its contract and the capture is kept
    Given the extraction rail is "snaptojson"
    And the extraction vendor breaks its contract
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__snaptojson_breaks_its_contract_and_the_capture_is_kept"
    And the database matches the snapshot "capture_contract_broken"
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | entries | 0     |

  @vendors
  Scenario: OpenAI breaks its contract and the capture is kept
    Given the extraction rail is "openai"
    And the extraction vendor breaks its contract
    And a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_captures__openai_breaks_its_contract_and_the_capture_is_kept"
    And the store holds:
      | table          | count |
      | captures       | 1     |
      | entries | 0     |
