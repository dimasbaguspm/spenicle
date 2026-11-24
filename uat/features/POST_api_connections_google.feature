Feature: POST /api/connections/google
  One file per route: every scenario here starts a Google authorisation.

  Scenario: A client and a redirect answer with an authorisation url
    Given a running API
    And I send a POST to "/api/connections/google" with:
      """json
      {"client_id":"client-id.apps.googleusercontent.com","client_secret":"client-secret","redirect_url":"http://localhost:8080/api/connections/google/callback"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_connections_google__a_client_answers_with_an_authorisation_url"

  Scenario: A start without a secret is refused
    Given a running API
    And I send a POST to "/api/connections/google" with:
      """json
      {"client_id":"client-id.apps.googleusercontent.com","redirect_url":"http://localhost:8080/api/connections/google/callback"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_connections_google__a_start_without_a_secret_is_refused"
