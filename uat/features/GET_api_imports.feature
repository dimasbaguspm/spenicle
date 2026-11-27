Feature: GET /api/imports
  One file per route: every scenario here calls GET /api/imports.
  The list carries every batch, terminal ones included, and the status filter
  narrows it to one state.

  Scenario: A draft appears in the batch list
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    When I send a GET to "/api/imports"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports__a_draft_appears_in_the_batch_list"

  Scenario: The status filter narrows the batches
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And I send a PATCH to "/api/imports/{{ref}}" with:
      """json
      {"action":"reject"}
      """
    And the response status is 200
    When I send a GET to "/api/imports?status=draft"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports__the_status_filter_narrows_the_batches"

  Scenario: A committed batch stays in the list
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And I send a PATCH to "/api/imports/{{ref}}/rows/0" with:
      """json
      {"status":"accepted"}
      """
    And the response status is 200
    And I send a PATCH to "/api/imports/{{ref}}" with:
      """json
      {"action":"commit"}
      """
    And the response status is 200
    When I send a GET to "/api/imports?status=committed"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports__a_committed_batch_stays_in_the_list"
