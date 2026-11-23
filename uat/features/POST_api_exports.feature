Feature: POST /api/exports
  One file per route: every scenario here calls POST /api/exports.
  An export is a job, not a document: the route answers `queued` and the worker
  renders it, so `client_id` is the idempotency key and a replay is free.

  Scenario: A queued job answers 201 and a replay answers 200
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_exports__a_queued_job_answers_201"
    And the last ref is remembered as "job"
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 200
    And the last ref is still "job"

  Scenario: The same client id with another format is refused
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"csv"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_exports__the_same_client_id_with_another_format_is_refused"

  Scenario: An unknown format is refused before a job exists
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"xml"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_exports__an_unknown_format_is_refused"
