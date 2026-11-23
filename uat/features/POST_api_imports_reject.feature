Feature: POST /api/imports/{ref}/reject
  One file per route: every scenario here calls the reject route.

  Scenario: Rejecting keeps the rows for audit and is idempotent
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a POST to "/api/imports/{{ref:batch}}/reject"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_imports_reject__rejecting_keeps_the_rows_for_audit"
    When I send a POST to "/api/imports/{{ref:batch}}/reject"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_imports_reject__rejecting_keeps_the_rows_for_audit"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | ledger_entries | 0     |
