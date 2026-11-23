Feature: PATCH /api/imports/{ref}/rows/{index}
  One file per route: every scenario here calls the row patch route.
  Every field is absolute, so sending the same body twice changes nothing.

  Scenario: A row patch is absolute, so a retry is a no-op
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"amount_minor":"-25000","status":"accepted"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_rows__a_row_patch_is_absolute_so_a_retry_is_a_no_op"
    When I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"amount_minor":"-25000","status":"accepted"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "patch_api_imports_rows__a_row_patch_is_absolute_so_a_retry_is_a_no_op"

  Scenario: A row patch without a single field is refused
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {}
      """
    Then the response status is 422
