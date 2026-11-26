Feature: GET /healthz
  One file per route: every scenario here calls GET /healthz.

  Scenario: Health reports the running state
    Given the base currency is "IDR"
    And a running API
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON matches the snapshot "get_healthz__health_reports_the_running_state"
    And the response header "Content-Type" is "application/json; charset=utf-8"

  Scenario: A browser preflight needs no credential
    Given a running API
    When I send an OPTIONS to "/healthz" with headers/query:
      | type   | key                            | value                      |
      | header | Origin                         | https://app.example.com    |
      | header | Access-Control-Request-Method  | GET                        |
      | header | Access-Control-Request-Headers | authorization,content-type |
    Then the response status is 204
    And the response header "Access-Control-Allow-Origin" is "https://app.example.com"
    And the response header "Access-Control-Allow-Methods" contains "GET"
    And the response header "Access-Control-Allow-Headers" contains "Authorization"
    And the response header "Access-Control-Expose-Headers" contains "Content-Disposition"
    And the response header "Vary" contains "Origin"

  Scenario: A browser preflight needs no credential even with a password
    Given the instance password is "uat-password-1234"
    And a running API
    When I send an OPTIONS to "/healthz" with headers/query:
      | type   | key                            | value                      |
      | header | Origin                         | https://app.example.com    |
      | header | Access-Control-Request-Method  | GET                        |
      | header | Access-Control-Request-Headers | authorization,content-type |
    Then the response status is 204
    And the response header "Access-Control-Allow-Origin" is "https://app.example.com"
