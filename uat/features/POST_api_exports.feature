Feature: POST /api/exports
  One file per route: every scenario here calls POST /api/exports.
  An export is a job, not a document: the route answers `queued` and the worker
  renders it, so `idempotency_key` is the key and a replay is free.

  Scenario: A queued job answers 201 and a replay answers 200
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_exports__a_queued_job_answers_201"
    And the last ref is remembered as "job"
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 200
    And the last ref is still "job"

  Scenario: The same idempotency key with another format is refused
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 201
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"csv"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_exports__the_same_client_id_with_another_format_is_refused"

  Scenario: An unknown format is refused before a job exists
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"xml"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_exports__an_unknown_format_is_refused"

  Scenario: A window travels with the job
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json","from":"2025-01-01","to":"2025-12-31"}
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_exports__a_window_travels_with_the_job"

  Scenario: One end of a window alone is refused
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","from":"2025-01-01"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_exports__one_end_of_a_window_alone_is_refused"

  Scenario: The same idempotency key with another window is refused
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 201
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json","from":"2025-01-01","to":"2025-12-31"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_exports__the_same_client_id_with_another_window_is_refused"
