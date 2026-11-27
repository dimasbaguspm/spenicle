Feature: GET /api/imports/{ref}
  One file per route: every scenario here calls the single batch route.

  Scenario: One batch comes back with its rows
    Given a running API
    And I upload the statement "march.csv" with the idempotency key "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a GET to "/api/imports/{{ref:batch}}"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref__one_batch_comes_back_with_its_rows"

  Scenario: An unknown batch is not found
    Given a running API
    When I send a GET to "/api/imports/00000000000000000000000000000000"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_imports_ref__an_unknown_batch_is_not_found"
