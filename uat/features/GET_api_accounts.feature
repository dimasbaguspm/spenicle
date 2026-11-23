Feature: GET /api/accounts
  One file per route: every scenario here calls GET /api/accounts.

  Scenario: The seeded accounts answer with their balance
    Given a running API
    When I send a GET to "/api/accounts"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_accounts__the_seeded_accounts_answer_with_their_balance"

  Scenario: A posted entry moves the balance, not a stored column
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-01","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1500"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1500"}]}
      """
    And the response status is 201
    When I send a GET to "/api/accounts"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_accounts__a_posted_entry_moves_the_balance"

  Scenario: The kind filter narrows the listing
    Given a running API
    When I send a GET to "/api/accounts?kind=expense"
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_accounts__the_kind_filter_narrows_the_listing"
