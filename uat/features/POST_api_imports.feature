Feature: POST /api/imports
  One file per route: every scenario here calls POST /api/imports.
  The statement contract is fixed: occurred_on,amount_minor,description.

  Scenario: A statement drafts one clean row and one duplicate
    Given a running API
    And the account "Cash" exists as "asset"
    And the account "Unsorted" exists as "expense"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2025-01-02","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-15000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"15000"}]}
      """
    And the response status is 201
    When I upload the statement "march.csv" with the idempotency key "statement-1" on the account "Cash":
      """csv
      occurred_on,amount_minor,description
      2025-01-02,-15000,COFFEE
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_imports__a_statement_drafts_one_clean_row_and_one_duplicate"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 2     |
      | entries | 1     |

  Scenario: Re-uploading the same bytes under the same client id resumes the draft
    Given a running API
    When I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 201
    And the last ref is remembered as "batch"
    When I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 200
    And the last ref is still "batch"
    And the response JSON matches the snapshot "post_api_imports__re_uploading_the_same_bytes_under_the_same_client_id_resumes_the_draft"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |

  Scenario: Re-uploading different bytes under the same client id is refused
    Given a running API
    When I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 201
    When I upload the statement "april.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-03-10,-20000,GROCERIES
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_imports__re_uploading_different_bytes_under_the_same_client_id_is_refused"
    And the import event log holds 1 event of kind "conflict_refused"

  Scenario: A statement without the expected header is refused
    Given a running API
    When I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      date,amount,memo
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_imports__a_statement_without_the_expected_header_is_refused"
    And the store holds:
      | table          | count |
      | import_batches | 0     |

  Scenario: Two chunks assemble into one draft
    Given a running API
    When I upload chunk 0 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      occurred_on,amount_m
      """
    Then the response status is 202
    And the response JSON matches the snapshot "post_api_imports__the_first_chunk_is_accepted"
    When I upload chunk 1 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      inor,description
      2025-02-10,-20000,GROCERIES
      2025-03-11,-30000,PHONE
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_imports__the_last_chunk_assembles_the_draft"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 2     |

  Scenario: Replaying a chunk changes nothing
    Given a running API
    When I upload chunk 0 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 202
    When I upload chunk 0 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_imports__replaying_a_chunk_changes_nothing"
    And the store holds:
      | table          | count |
      | import_batches | 0     |

  Scenario: A chunked upload survives a restart
    Given a running API
    When I upload chunk 0 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      occurred_on,amount_m
      """
    Then the response status is 202
    When the API restarts
    And I upload chunk 1 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      inor,description
      2025-02-10,-20000,GROCERIES
      2025-03-11,-30000,PHONE
      """
    Then the response status is 201
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 2     |

  Scenario: A chunk whose total disagrees with the open upload is refused
    Given a running API
    When I upload chunk 0 of 2 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    Then the response status is 202
    When I upload chunk 1 of 3 of the statement "march.csv" with the idempotency key "chunked-1":
      """csv
      2025-03-11,-30000,PHONE
      """
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_imports__a_chunk_with_another_total_is_refused"

  Scenario: A statement header may arrive in any order
    Given a running API
    When I upload the statement "reordered.csv" with the idempotency key "statement-reordered":
      """csv
      description,amount_minor,occurred_on
      COFFEE,-20000,2025-02-10
      """
    Then the response status is 201
    And the response JSON matches the snapshot "post_api_imports__a_statement_header_may_arrive_in_any_order"
    And the store holds:
      | table          | count |
      | import_batches | 1     |
      | import_rows    | 1     |
