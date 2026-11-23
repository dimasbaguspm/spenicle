Feature: GET /healthz
  One file per route: every scenario here calls GET /healthz.

  Scenario: Health reports the running state
    Given the base currency is "IDR"
    And a running API
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON at "$.status" is "ok"
    And the response JSON at "$.schema_version" is "1"
    And the response JSON at "$.base_currency" is "IDR"
    And the response JSON at "$.app_secret" is "{{fingerprint}}"
    And the response header "Content-Type" is "application/json; charset=utf-8"
