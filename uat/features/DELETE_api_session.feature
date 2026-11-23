Feature: DELETE /api/session
  One file per route: every scenario here calls DELETE /api/session.

  Scenario: Signing out clears the cookie
    Given a running API
    When I send a DELETE to "/api/session"
    Then the response status is 200
    And the response JSON at "$.status" is "signed_out"
    And the response header "Set-Cookie" contains "spenicle_session="
    And the response header "Set-Cookie" contains "Max-Age=0"
    And the response header "Set-Cookie" contains "HttpOnly"
