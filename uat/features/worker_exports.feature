Feature: Worker export jobs
  The worker is what turns a queued export into a document: it claims the job,
  renders the ledger it already reads, stores the bytes and completes the job.
  The sweep is the second half: a job that never finished is failed, and a ready
  job past its retention loses its blob.

  Scenario: A queued job becomes a downloadable document with a summary
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
    And the response JSON matches the snapshot "worker_exports__a_queued_job_becomes_a_downloadable_document"
    When I send a GET to "/api/exports/{{ref}}/download"
    Then the response status is 200
    And the response header "Content-Type" is "application/json"
    And the export JSON matches the snapshot "worker_exports__the_document_carries_the_ledger_and_its_summary"
    And the export summary matches the snapshot "worker_exports__the_summary_carries_balances_months_and_categories"

  Scenario: A run with nothing queued leaves the queue empty
    Given a running API
    When the export worker runs
    Then I send a GET to "/api/exports"
    And the response status is 200
    And the response JSON matches the snapshot "worker_exports__a_run_with_nothing_queued_leaves_the_queue_empty"

  Scenario: A job orphaned by a restart is resumed and finished
    Given a running API
    When I send a POST to "/api/exports" with:
      """json
      {"client_id":"export-restart","format":"json"}
      """
    Then the response status is 201
    When the export worker claims the job and dies
    And the export worker runs
    When I send a GET to "/api/exports/{{ref}}/events"
    Then the response status is 200
    And the export events are "queued,started,resumed,started,completed"
