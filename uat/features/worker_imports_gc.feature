Feature: Worker import GC
  A statement draft that nobody reviewed expires. The worker reclaims it: the rows,
  the stored bytes and one expired event. A committed or rejected batch outlives its
  expiry forever, rows, blob and events included.

  Scenario: An expired draft loses its rows, its file and leaves one expired event
    Given a running API
    When I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 201
    When the import draft is older than its expiry
    And the artifact garbage collector runs
    Then the store holds:
      | table          | count |
      | import_batches | 0     |
      | import_rows    | 0     |
      | ledger_entries | 0     |
    And the import event log holds 1 event of kind "expired"

  Scenario: A committed batch outlives its expiry
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
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
    When the import draft is older than its expiry
    And the artifact garbage collector runs
    Then the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | ledger_entries | 1     |
    And the import event log holds 1 event of kind "committed"
    And the import event log holds 0 events of kind "expired"

  Scenario: A rejected batch outlives its expiry
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
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
    When the import draft is older than its expiry
    And the artifact garbage collector runs
    Then the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | ledger_entries | 0     |
    And the import event log holds 1 event of kind "rejected"
    And the import event log holds 0 events of kind "expired"
