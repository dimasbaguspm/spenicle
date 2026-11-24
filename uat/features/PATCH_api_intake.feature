Feature: PATCH /api/intake
  One file per route: every scenario here writes the intake configuration.

  Scenario: Turning intake on stores a sealed allowlist
    Given a running API
    And I send a PATCH to "/api/intake" with:
      """json
      {"enabled":true,"allowlist":["bank.example"]}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_intake__turning_intake_on_stores_the_allowlist"
    When I send a GET to "/api/intake"
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_intake__the_configuration_reads_back"
