Feature: GET /api/intake/messages/{{ref}}
  One file per route: every scenario here reads one mail reference.

  Scenario: An unknown mail reference is not found
    Given a running API
    When I send a GET to "/api/intake/messages/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_intake_messages_ref__an_unknown_reference_is_not_found"
