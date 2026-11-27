Feature: GET /api/exports/{ref}/events
  One file per route: every scenario here calls GET /api/exports/{ref}/events.
  The trail is append-only: queued by the API, started and completed by the worker,
  downloaded by the client, expired by the sweep.

  Scenario: A rendered job carries its trail
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports_ref_events__a_rendered_job_carries_its_trail"

  Scenario: A download is one more event
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/download"
    Then the response status is 200
    When I send a GET to "/api/exports/{{ref}}/events"
    Then the response status is 200
    And the export events are "queued,started,completed,downloaded"
    And the export event log holds 1 event of kind "downloaded"

  Scenario: An unknown job has no events
    Given a running API
    When I send a GET to "/api/exports/00000000000000000000000000000000/events"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_exports_ref_events__an_unknown_job_has_no_events"

  Scenario: A windowed job echoes its window in its trail
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"idempotency_key":"export-1","format":"json","from":"2025-01-01","to":"2025-12-31"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports_ref_events__a_windowed_job_echoes_its_window"
