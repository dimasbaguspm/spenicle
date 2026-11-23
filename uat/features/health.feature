Feature: Health
  A monitor and the boot sequence need to know the schema version, the secret
  fingerprint (APP_SECRET is mandatory, so data is always sealed), and what
  currency the ledger reports in.

  Scenario: Health reports the running state
    Given the base currency is "IDR"
    And a running API
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON at "$.status" is "ok"
    And the response JSON at "$.schema_version" is "4"
    And the response JSON at "$.base_currency" is "IDR"
    And the response JSON at "$.app_secret" is "{{fingerprint}}"
    And the response header "Content-Type" is "application/json; charset=utf-8"

  Scenario: An unknown route answers with a JSON error, not HTML
    Given a running API
    When I send a GET to "/nope"
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
