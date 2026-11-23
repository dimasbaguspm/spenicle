Feature: POST /api/imports/{ref}/commit
  One file per route: every scenario here calls the commit route.

  Scenario: Committing posts the accepted rows and a replay changes nothing
    Given a running API
    And the account "Cash" exists as "asset"
    And the account "Unsorted" exists as "expense"
    And I upload the statement "march.csv" with the client id "statement-1" on the account "Cash":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      2025-03-11,-30000,PHONE
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"amount_minor":"-17500","description":"GROCERIES AND SOAP","status":"accepted"}
      """
    And the response status is 200
    When I send a POST to "/api/imports/{{ref:batch}}/commit"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_imports_commit__committing_posts_the_accepted_rows"
    And the ledger holds an entry with client id prefix "import:" and source "statement"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | ledger_entries | 1     |
    When I send a POST to "/api/imports/{{ref:batch}}/commit"
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_imports_commit__committing_posts_the_accepted_rows"
    And the store holds:
      | table          | count |
      | ledger_entries | 1     |

  Scenario: A rejected batch refuses the commit and keeps its rows
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a POST to "/api/imports/{{ref:batch}}/reject"
    And the response status is 200
    When I send a POST to "/api/imports/{{ref:batch}}/commit"
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_imports_commit__a_rejected_batch_refuses_the_commit"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | ledger_entries | 0     |
