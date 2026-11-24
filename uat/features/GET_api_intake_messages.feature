Feature: GET /api/intake/messages
  One file per route: every scenario here lists the mail references.

  Scenario: Nothing polled yet leaves an empty listing
    Given a running API
    When I send a GET to "/api/intake/messages"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_intake_messages__nothing_polled_yet_is_empty"

  Scenario: A poll leaves one captured reference in the listing
    Given a running API
    And I send a PATCH to "/api/intake" with:
      """json
      {"enabled":true,"allowlist":["bank.example"]}
      """
    And I send a POST to "/api/intake/run"
    And the response status is 200
    When I send a GET to "/api/intake/messages?status=captured"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_intake_messages__a_poll_leaves_one_captured_reference"

  Scenario: A malformed status filter is refused
    Given a running API
    When I send a GET to "/api/intake/messages?status=maybe"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_intake_messages__a_malformed_status_filter_is_refused"
