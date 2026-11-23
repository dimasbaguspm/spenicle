Feature: Session
  One user, one cookie, no password until the first boot generates one. The API is
  usable in open mode, and the cookie is the only credential once a password exists.

  Scenario: Signing in on an instance without a password answers 409
    Given a running API
    When I send a POST to "/api/session" with:
      """json
      {"password":"anything-at-all"}
      """
    Then the response status is 409
    And the response JSON at "$.error.code" is "no_password_set"

  Scenario: Signing out clears the cookie
    Given a running API
    When I send a DELETE to "/api/session"
    Then the response status is 200
    And the response JSON at "$.status" is "signed_out"
    And the response header "Set-Cookie" contains "spenicle_session="
    And the response header "Set-Cookie" contains "Max-Age=0"
    And the response header "Set-Cookie" contains "HttpOnly"

  Scenario: A mutating request from another origin is refused
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"1"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value                |
      | header | Origin       | https://evil.example |
      | header | Content-Type | application/json     |
    Then the response status is 403
    And the response JSON at "$.error.code" is "cross_origin_denied"

  Scenario: A request without an Origin header is allowed
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":1,"amount_minor":"-1"},{"account_id":2,"amount_minor":"1"}]}
      """
    When I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
