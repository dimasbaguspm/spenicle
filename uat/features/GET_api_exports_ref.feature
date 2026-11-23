Feature: GET /api/exports/{ref}
  One file per route: every scenario here calls GET /api/exports/{ref}.
  The job is the promise; this route is how a client watches it.

  Scenario: One job comes back by ref
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    When I send a GET to "/api/exports/{{ref}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports_ref__one_job_comes_back_by_ref"

  Scenario: A rendered job answers ready with its counts
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_exports_ref__a_rendered_job_answers_ready_with_its_counts"

  Scenario: An unknown job is not found
    Given a running API
    When I send a GET to "/api/exports/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_exports_ref__an_unknown_job_is_not_found"
