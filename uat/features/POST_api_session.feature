Feature: POST /api/session
  One file per route: every scenario here calls POST /api/session.

  Scenario: Signing in on an instance without a password answers 409
    Given a running API
    When I send a POST to "/api/session" with:
      """json
      {"password":"anything-at-all"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_session__signing_in_on_an_instance_without_a_password_answers_409"
