Feature: POST /api/rates/refresh
  The route is gone on purpose: the system scrapes and caches, GET only reads.

  Scenario: Triggering a refresh over HTTP is not a route
    Given a running API
    When I send a POST to "/api/rates/refresh"
    Then the response status is 404
    And the response JSON at "$.error.code" is "not_found"
