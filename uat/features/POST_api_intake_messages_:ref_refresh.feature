Feature: POST /api/intake/messages/{{ref}}/refresh
  One file per route: every scenario here re-reads one mail from the provider.

  Scenario: Refreshing an unknown mail reference is not found
    Given a running API
    When I send a POST to "/api/intake/messages/00000000000000000000000000000000/refresh"
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_intake_messages_ref_refresh__an_unknown_reference_is_not_found"
