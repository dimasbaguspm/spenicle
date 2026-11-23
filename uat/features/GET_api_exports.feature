Feature: GET /api/exports
  One file per route: every scenario here calls GET /api/exports.
  The listing is the job queue, newest first, paged by ref like every other list.

  Scenario: A queued job appears in the listing
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1"}
      """
    Then the response status is 201
    When I send a GET to "/api/exports"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports__a_queued_job_appears_in_the_listing"

  Scenario: The status filter narrows the listing
    Given a running API
    And I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    And the response status is 201
    And the export worker runs
    And I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-2","format":"csv"}
      """
    And the response status is 201
    When I send a GET to "/api/exports" with headers/query:
      | type  | key    | value |
      | query | status | ready |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports__the_status_filter_narrows_the_listing"

  Scenario: An unknown status is refused
    Given a running API
    When I send a GET to "/api/exports" with headers/query:
      | type  | key    | value  |
      | query | status | bogus  |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_exports__an_unknown_status_is_refused"
