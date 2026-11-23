Feature: Worker artifact GC
  The artifacts of rejected captures are reclaimed once they outlive the retention,
  and nothing else is: the worker never touches a document a reviewer may still open.

  Scenario: A rejected capture older than the retention loses its file
    Given a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    When the request body is:
      """json
      {"action":"reject","reason":"not a receipt"}
      """
    And I send a PATCH to "/api/captures/{{ref}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 200
    When the capture artifact predates the retention
    And the artifact garbage collector runs
    Then the capture artifact is gone
    And the store holds:
      | table     | count |
      | artifacts | 1     |
    And the database matches the snapshot "worker_gc__a_rejected_capture_older_than_the_retention_loses_its_file"
    When the artifact garbage collector runs
    Then the capture artifact is gone

  Scenario: A pending capture keeps its artifact however old it is
    Given a running API
    When I send a POST to "/api/captures" with the artifact "receipt.jpg"
    Then the response status is 202
    When the capture artifact predates the retention
    And the artifact garbage collector runs
    Then I send a GET to "/api/captures/{{ref}}/artifact"
    And the response status is 200
    And the database matches the snapshot "worker_gc__a_pending_capture_keeps_its_artifact_however_old_it_is"
