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
    And the response JSON matches the snapshot "get_api_rates__the_cached_rate_answers_one_pair_on_one_day"

  Scenario: A day nobody fetched answers 404
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2020-01-01 |
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_rates__a_day_nobody_fetched_answers_404"

  Scenario: An unknown currency code is refused before any lookup
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | XXX        |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_rates__an_unknown_currency_code_is_refused_before_any_lookup"

  Scenario: A cleared cache falls back to the stored rate
    Given a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2026-11-20 |
    Then the response status is 200
    When the local cache is cleared
    And I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2026-11-20 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_rates__a_cleared_cache_falls_back_to_the_stored_rate"

  @vendors
  Scenario: A dead ECB leaves the app up and the pair unknown
    Given the rates vendor is down
    And a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2026-11-20 |
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_rates__a_dead_ecb_leaves_the_app_up_and_the_pair_unknown"
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_rates__a_dead_ecb_leaves_the_process_healthy"

  @vendors
  Scenario: A broken ECB sheet leaves the pair unknown
    Given the rates vendor breaks its contract
    And a running API
    When I send a GET to "/api/rates" with headers/query:
      | type  | key   | value      |
      | query | base  | EUR        |
      | query | quote | USD        |
      | query | on    | 2026-11-20 |
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_rates__a_broken_ecb_sheet_leaves_the_pair_unknown"
    When I send a GET to "/healthz"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_rates__a_broken_ecb_sheet_leaves_the_process_healthy"
