Feature: GET /api/intake
  One file per route: every scenario here reads the intake configuration.

  Scenario: A fresh instance has intake off and no allowlist
    Given a running API
    When I send a GET to "/api/intake"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_intake__a_fresh_instance_has_intake_off"
