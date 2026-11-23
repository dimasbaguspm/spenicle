Feature: GET /api/rates
  One file per route: every scenario here calls GET /api/rates.

  Scenario: The cached rate answers one pair on one day
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2026-11-20 |
    Then the response status is 200
    And the response JSON at "$.base" is "EUR"
    And the response JSON at "$.quote" is "USD"
    And the response JSON at "$.rate" is "1.0990"
    And the response JSON at "$.on_date" is "2026-11-20"
    And the response JSON at "$.source" is "ecb"

  Scenario: A day nobody fetched answers 404
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2020-01-01 |
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"

  Scenario: An unknown currency code is refused before any lookup
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | XXX        |
    Then the response status is 422
    And the response JSON at "$.error.code" is "unknown_currency"
