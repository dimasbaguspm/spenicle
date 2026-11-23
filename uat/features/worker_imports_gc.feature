Feature: Worker import GC
  A statement draft that nobody committed expires. The worker reclaims it: the
  rows and the stored bytes go, and nothing else is touched.

  Scenario: An expired draft loses its rows and its file
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
    And I send a POST to "/api/imports/{{ref}}/commit"
    And the response status is 200
    When the import draft is older than its expiry
    And the artifact garbage collector runs
    Then the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | ledger_entries | 1     |
