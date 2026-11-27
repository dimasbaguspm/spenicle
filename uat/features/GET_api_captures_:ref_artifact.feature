Feature: GET /api/captures/{ref}/artifact
  One file per route: every scenario here calls GET /api/captures/{ref}/artifact.
  The document behind a capture is downloaded byte for byte, or answered with the
  same small error envelope as every other route.

  Scenario: The uploaded receipt comes back byte for byte
    Given a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    When I send a GET to "/api/captures/{{ref}}/artifact"
    Then the response status is 200
    And the response body hashes to "b3be5f5a9d30ee36242604380bd4ce604ee24fa17095cc02b062086e09983819"
    And the response header "Content-Type" is "application/octet-stream"
    And the response header "Content-Disposition" contains "attachment; filename="
    And the response header "Content-Disposition" contains "receipt.jpg"
    And the response header "X-Content-Type-Options" is "nosniff"
    And the response header "Cache-Control" is "private, no-store"
    And the store holds:
      | table     | count |
      | artifacts | 1     |

  Scenario: A capture with no artifact answers 404
    Given a running API
    When I send a POST to "/api/captures" with:
      """json
      {"kind":"share","raw_text":"no document behind this one"}
      """
    Then the response status is 202
    When I send a GET to "/api/captures/{{ref}}/artifact"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_captures_artifact__a_capture_with_no_artifact_answers_404"

  Scenario: An unknown capture ref answers 404
    Given a running API
    When I send a GET to "/api/captures/0123456789abcdef0123456789abcdef/artifact"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_captures_artifact__an_unknown_capture_ref_answers_404"

  Scenario: A reclaimed artifact answers 410, not 404
    Given a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    And the last ref is remembered as "capture"
    When I send a PATCH to "/api/captures/{{ref:capture}}" with:
      """json
      {"action":"reject","reason":"not my receipt"}
      """
    Then the response status is 200
    And the capture artifact predates the retention
    And the artifact garbage collector runs
    And the capture artifact is gone
    When I send a GET to "/api/captures/{{ref:capture}}/artifact"
    Then the response status is 410
    And the response JSON matches the snapshot "get_api_captures_artifact__a_reclaimed_artifact_answers_410"
