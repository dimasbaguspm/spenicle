Feature: POST /api/connections/{{ref}}/revoke
  One file per route: every scenario here revokes a provider connection.

  Scenario: Revoking a connection that was never made is not found
    Given a running API
    When I send a POST to "/api/connections/00000000000000000000000000000000/revoke"
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_connections_ref_revoke__an_unknown_connection_is_not_found"
