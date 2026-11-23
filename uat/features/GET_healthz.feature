Feature: GET /healthz
  One file per route: every scenario here calls GET /healthz.

  Scenario: Health reports the running state
    Given the base currency is "IDR"
    And a running API
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON matches the snapshot "get_healthz__health_reports_the_running_state"
    And the response header "Content-Type" is "application/json; charset=utf-8"
