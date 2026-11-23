Feature: POST /api/rates/refresh
  The route is gone on purpose: the system scrapes and caches, GET only reads.

  Scenario: Triggering a refresh over HTTP is not a route
    Given a running API
    When I send a POST to "/api/rates/refresh"
    Then the response status is 404
    And the response JSON matches the snapshot "post_api_rates_refresh__triggering_a_refresh_over_http_is_not_a_route"
