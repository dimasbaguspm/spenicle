@vendors
Feature: GET /api/connections/google/callback
  One file per route: every scenario here finishes a Google authorisation.

  Scenario: Completing the authorisation stores a sealed grant
    Given a running API
    And I send a POST to "/api/connections/google" with:
      """json
      {"client_id":"client-id.apps.googleusercontent.com","client_secret":"client-secret","redirect_url":"http://localhost:8080/api/connections/google/callback"}
      """
    And the response status is 201
    When I complete the google authorisation with the code "code-1"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_connections_google_callback__completing_the_authorisation_stores_a_grant"

  Scenario: A forged state is refused
    Given a running API
    And I send a POST to "/api/connections/google" with:
      """json
      {"client_id":"client-id.apps.googleusercontent.com","client_secret":"client-secret","redirect_url":"http://localhost:8080/api/connections/google/callback"}
      """
    When I send a GET to "/api/connections/google/callback?code=code-1&state=forged"
    Then the response status is 401
    And the response JSON matches the snapshot "get_api_connections_google_callback__a_forged_state_is_refused"
