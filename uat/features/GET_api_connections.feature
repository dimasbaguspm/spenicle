Feature: GET /api/connections
  One file per route: every scenario here calls the single connection status route.

  Scenario: A fresh instance has no provider connected
    Given a running API
    When I send a GET to "/api/connections"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_connections__a_fresh_instance_has_no_provider_connected"
