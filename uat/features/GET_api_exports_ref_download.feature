Feature: GET /api/exports/{ref}/download
  One file per route: every scenario here calls GET /api/exports/{ref}/download.
  The bytes are the job's, rendered by the worker and stored in the artifact store:
  a queued job is not downloadable, an expired one is gone for good.

  Scenario: A queued job is not downloadable yet
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    When I send a GET to "/api/exports/{{ref}}/download"
    Then the response status is 409
    And the response JSON matches the snapshot "get_api_exports_ref_download__a_queued_job_is_not_downloadable_yet"

  Scenario: The csv job is a zip of sheets, a summary and a manifest
    Given a running API
    When I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    Then the response status is 201
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"csv"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/download"
    Then the response status is 200
    And the response header "Content-Type" is "application/zip"
    And the response header "Cache-Control" is "private, no-store"
    And the response header "Content-Disposition" contains ".zip"
    And the export archive holds "accounts.csv,payees.csv,entries.csv,postings.csv,captures.csv,rates.csv,recurring.csv,custom_queries.csv,categorization_rules.csv,summary.json,manifest.json"
    And the export manifest reports "entries.csv" rows "1"
    And the export manifest reports "postings.csv" rows "2"

  Scenario: A job past its retention is gone
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json"}
      """
    Then the response status is 201
    And the export worker runs
    When the export job predates the retention
    And the export worker runs
    Then the export blob is gone from the exports directory
    When I send a GET to "/api/exports/{{ref}}/download"
    And the response status is 410
    And the response JSON matches the snapshot "get_api_exports_ref_download__a_job_past_its_retention_is_gone"
    When I send a GET to "/api/exports/{{ref}}/events"
    Then the response status is 200
    And the export events are "queued,started,completed,expired"

  Scenario: An unknown job is not found
    Given a running API
    When I send a GET to "/api/exports/00000000000000000000000000000000/download"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_exports_ref_download__an_unknown_job_is_not_found"

  Scenario: A windowed job is named with its window
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-1","format":"json","from":"2025-01-01","to":"2025-12-31"}
      """
    Then the response status is 201
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/download"
    Then the response status is 200
    And the response header "Content-Disposition" contains "spenicle-2025-01-01_2025-12-31.json"
    And the response header "Content-Type" is "application/json"
