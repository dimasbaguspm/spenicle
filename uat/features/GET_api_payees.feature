Feature: GET /api/payees
  One file per route: every scenario here calls GET /api/payees.

  Scenario: An empty payee list answers an empty array
    Given a running API
    When I send a GET to "/api/payees"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_payees__an_empty_payee_list_answers_an_empty_array"

  Scenario: A created payee is listed with its default account
    Given a running API
    And the request body is:
      """json
      {"name":"KOPI KENANGAN","default_account_ref":"{{account:Cash}}"}
      """
    When I send a POST to "/api/payees" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 201
    When I send a GET to "/api/payees"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_payees__a_created_payee_is_listed_with_its_default_account"

  Scenario: The query filter narrows the listing
    Given a running API
    And the request body is:
      """json
      {"name":"KOPI KENANGAN"}
      """
    When I send a POST to "/api/payees" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"name":"TOKO ROTI"}
      """
    And I send a POST to "/api/payees" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And I send a GET to "/api/payees?query=kopi"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_payees__the_query_filter_narrows_the_listing"
    When I send a GET to "/api/payees?query=kenangan"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_payees__the_query_filter_matches_only_a_prefix"
