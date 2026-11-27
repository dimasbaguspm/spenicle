Feature: PATCH /api/imports/{ref}
  One file per route: every scenario here calls the review route. One body action
  closes a draft: commit posts the accepted rows, reject throws the draft away and
  keeps the evidence. The same action twice is a no-op, the other one is a 409.

  Scenario: Committing posts the accepted rows and a replay changes nothing
    Given a running API
    And the account "Cash" exists as "asset"
    And the account "Unsorted" exists as "expense"
    And I upload the statement "march.csv" with the idempotency key "statement-1" on the account "Cash":
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
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_ref__committing_posts_the_accepted_rows"
    And the ledger holds an entry with idempotency key prefix "import:" and source "statement"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | entries | 1     |
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_ref__committing_posts_the_accepted_rows"
    And the store holds:
      | table          | count |
      | entries | 1     |

  Scenario: Rejecting keeps the rows for audit and is idempotent
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"reject","reason":"the wrong month"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_ref__rejecting_keeps_the_rows_for_audit"
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"reject","reason":"the wrong month"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_ref__rejecting_keeps_the_rows_for_audit"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | entries | 0     |

  Scenario: A rejected batch refuses the commit and keeps its rows
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"reject"}
      """
    And the response status is 200
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_imports_ref__a_rejected_batch_refuses_the_commit"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
      | entries | 0     |

  Scenario: A committed batch refuses the row patch
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"status":"accepted"}
      """
    And the response status is 200
    And I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    And the response status is 200
    When I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"amount_minor":"-25000"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_imports_ref__a_committed_batch_refuses_the_row_patch"

  Scenario Outline: The action must be one of the two the review screen sends
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      <body>
      """
    Then the response status is 422

    Examples:
      | body                   |
      | {"action":"approve"}   |
      | {"action":""}          |

  Scenario: A commit posts in chunks and records its progress
    Given the import commit chunk size is "2"
    And a running API
    And the account "Cash" exists as "asset"
    And the account "Unsorted" exists as "expense"
    And I upload the statement "march.csv" with the idempotency key "statement-1" on the account "Cash":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      2025-02-11,-20001,COFFEE
      2025-02-12,-20002,PHONE
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"status":"accepted"}
      """
    And the response status is 200
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/1" with:
      """json
      {"status":"accepted"}
      """
    And the response status is 200
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/2" with:
      """json
      {"status":"accepted"}
      """
    And the response status is 200
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    Then the response status is 200
    And the import event log holds 2 events of kind "committing"
    And the ledger holds an entry with idempotency key prefix "import:" and source "statement"
    And the store holds:
      | table          | count |
      | entries | 3     |

  Scenario: A row cannot change while the batch commits
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When the import batch is mid-commit
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"amount_minor":"-25000"}
      """
    Then the response status is 409
    And the response JSON matches the snapshot "patch_api_imports_ref__a_row_cannot_change_mid_commit"
