Feature: Health
  A monitor and the boot sequence need to know the schema version, whether the
  data is sealed, and what currency the ledger reports in.

  Scenario: Health reports the running state
    Given the base currency is "IDR"
    And a running API
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON at "$.status" is "ok"
    And the response JSON at "$.schema_version" is "1"
    And the response JSON at "$.base_currency" is "IDR"
    And the response JSON at "$.app_secret" is "unsealed"
    And the response header "Content-Type" is "application/json; charset=utf-8"

  Scenario: An unknown route answers with a JSON error, not HTML
    Given a running API
    When I send a GET to "/nope"
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"

  Scenario: The base currency cannot be changed after it is locked
    Given the base currency is "USD"
    And a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-09-14","currency":"USD","postings":[{"account_id":1,"amount_minor":"100"},{"account_id":2,"amount_minor":"-100"}]}
      """
    Then the response status is 201
    And the response JSON at "$.postings[0].base_amount_minor" is "100"
    And the response JSON at "$.postings[0].fx_source" is "identity"
