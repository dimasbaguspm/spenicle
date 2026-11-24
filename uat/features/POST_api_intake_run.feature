Feature: POST /api/intake/run
  One file per route: every scenario here runs one poll.

  Scenario: Polling a switched-off intake is refused
    Given a running API
    When I send a POST to "/api/intake/run"
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_intake_run__a_switched_off_intake_is_refused"

  Scenario: One poll turns an allowed mail into a capture
    Given a running API
    And I send a PATCH to "/api/intake" with:
      """json
      {"enabled":true,"allowlist":["bank.example"]}
      """
    And the response status is 200
    When I send a POST to "/api/intake/run"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_intake_run__one_poll_creates_a_capture"

  Scenario: A sender outside the allowlist is skipped
    Given a running API
    And I send a PATCH to "/api/intake" with:
      """json
      {"enabled":true,"allowlist":["nowhere.example"]}
      """
    And the response status is 200
    When I send a POST to "/api/intake/run"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_intake_run__a_sender_outside_the_allowlist_is_skipped"
