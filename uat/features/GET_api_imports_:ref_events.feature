Feature: GET /api/imports/{ref}/events
  One file per route: every scenario here calls the event log. The log is
  append-only, newest first, and one page carries the shared list envelope.

  Scenario: An upload emits uploaded
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    When I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__an_upload_emits_uploaded"

  Scenario: A resumed upload emits resumed
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 200
    When I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__a_resumed_upload_emits_resumed"

  Scenario: A row edit emits the fields it changed
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      """
    And the response status is 201
    And the last ref is remembered as "batch"
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"occurred_on":"2025-02-11","amount_minor":"-21000"}
      """
    And the response status is 200
    And I send a PATCH to "/api/imports/{{ref:batch}}/rows/0" with:
      """json
      {"status":"accepted","description":"GROCERIES AND SOAP"}
      """
    And the response status is 200
    When I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__a_row_edit_emits_the_fields_it_changed"

  Scenario: A commit emits committed
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
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
    When I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__a_commit_emits_committed"
    When I send a PATCH to "/api/imports/{{ref:batch}}" with:
      """json
      {"action":"commit"}
      """
    And the response status is 200
    And I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response JSON matches the snapshot "get_api_imports_ref_events__a_commit_emits_committed"

  Scenario: The events page carries the list envelope
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-1":
      """csv
      occurred_on,amount_minor,description
      2025-02-10,-20000,GROCERIES
      2025-03-11,-30000,PHONE
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
      {"status":"skipped"}
      """
    And the response status is 200
    When I send a GET to "/api/imports/{{ref:batch}}/events?limit=2"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__the_events_page_carries_the_list_envelope"

  Scenario: An unknown batch has no events
    Given a running API
    When I send a GET to "/api/imports/00000000000000000000000000000000/events"
    Then the response status is 404
    And the response JSON matches the snapshot "get_api_imports_ref_events__an_unknown_batch_has_no_events"

  Scenario: A reject keeps its reason on the event, not on the batch
    Given a running API
    And I upload the statement "march.csv" with the client id "statement-reason":
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
    When I send a GET to "/api/imports/{{ref:batch}}/events"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_imports_ref_events__a_reject_keeps_its_reason"
