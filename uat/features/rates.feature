Feature: Reference rates
  The app scrapes the ECB daily sheet from the containerised mock and answers a stored
  pair. Nothing here reaches the network.

  Scenario: A refresh stores every rate the sheet carries
    Given a running API
    When I send a POST to "/api/rates/refresh"
    Then the response status is 200
    And the response JSON at "$.stored" is "3"
    And the response JSON at "$.on_date" is "2026-11-20"
    And the response JSON at "$.source" is "ecb"
    And the store holds:
      | table    | count |
      | fx_rates | 3     |

  Scenario: The stored rate answers one pair on one day
    Given a running API
    When I send a POST to "/api/rates/refresh"
    And I send a GET to "/api/rates" with headers/query:
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

  Scenario: A second refresh replaces the same day instead of duplicating it
    Given a running API
    When I send a POST to "/api/rates/refresh"
    And I send a POST to "/api/rates/refresh"
    Then the response status is 200
    And the store holds:
      | table    | count |
      | fx_rates | 3     |
