Feature: POST /api/setup
  One file per route: every scenario here calls POST /api/setup.

  Scenario: A fresh instance is open until the setup closes it
    Given a running API
    When I send a GET to "/api/entries"
    Then the response status is 200
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"IDR"}
      """
    Then the response status is 200
    When I send a GET to "/api/entries" with headers/query:
      | type   | key           | value          |
      | header | Authorization | Bearer nothing |
    Then the response status is 401
    And the response JSON matches the snapshot "post_api_setup__a_claimed_instance_refuses_a_stranger"

  Scenario: The base currency is chosen before the first entry
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"usd"}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_setup__the_base_currency_is_chosen_before_the_first_entry"

  Scenario: A setup without a password is refused before it touches the database
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"base_currency":"usd"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_setup__a_setup_without_a_password_is_refused"
    And the store holds:
      | table    | count |
      | settings | 2     |

  Scenario: A weak password is refused before the ledger locks
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"short","base_currency":"usd"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_setup__a_weak_password_is_refused"

  Scenario: A currency-less setup is refused
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123"}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_setup__a_currency_less_setup_is_refused"

  Scenario: The currency is locked after the first entry
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"100"},{"account_ref":"{{account:Cash}}","amount_minor":"-100"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"password":"chosen-password-123","base_currency":"USD"}
      """
    When I send a POST to "/api/setup" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_setup__the_currency_is_locked_after_the_first_entry"

  Scenario: Opening balances create a locked ledger in one write
    Given the API clock is "2026-02-14"
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"USD","accounts":[{"name":"Cash","kind":"asset","opening_balance_minor":"125000"},{"name":"Card","kind":"liability","opening_balance_minor":"-50000"}]}
      """
    Then the response status is 200
    And the response JSON matches the snapshot "post_api_setup__opening_balances_create_a_locked_ledger_in_one_write"
    And the account "Opening balance" exists as "equity"
    And the store holds:
      | table           | count |
      | accounts        | 4     |
      | entries  | 2     |
      | postings | 4     |
    And the journal holds 3 "account" rows
    And the journal holds 2 "ledger_entry" rows
    And the journal holds 4 "setting" rows
    And the database matches the snapshot "post_api_setup__opening_balances"

  Scenario: Currency-only setup still locks the ledger
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"USD"}
      """
    Then the response status is 200
    When the bearer credential is "chosen-password-123"
    And the request body is:
      """json
      {"password":"chosen-password-123","base_currency":"EUR"}
      """
    When I send a POST to "/api/setup" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_setup__currency_only_setup_still_locks_the_ledger"

  Scenario Outline: An invalid opening account is refused
    Given a running API
    When I send a POST to "/api/setup" with:
      """json
      {"password":"chosen-password-123","base_currency":"USD","accounts":<accounts>}
      """
    Then the response status is 422
    And the response JSON matches the snapshot "post_api_setup__invalid_opening_account_<name>"
    And the store holds:
      | table          | count |
      | accounts       | 2     |
      | entries | 0     |

    Examples:
      | name         | accounts                                                                                          |
      | zero balance | [{"name":"Cash","kind":"asset","opening_balance_minor":"0"}]                                       |
      | reserved     | [{"name":"Opening balance","kind":"equity","opening_balance_minor":"100"}]                        |
      | duplicate    | [{"name":"Cash","kind":"asset","opening_balance_minor":"100"},{"name":"Cash","kind":"asset","opening_balance_minor":"200"}] |

  Scenario: A failed opening setup leaves no partial accounts or entries
    Given a running API
    And the account "Cash" exists as "asset"
    And the request body is:
      """json
      {"archived":true}
      """
    And I send a PATCH to "/api/accounts/{{account:Cash}}" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    And the request body is:
      """json
      {"password":"chosen-password-123","base_currency":"USD","accounts":[{"name":"New bank","kind":"asset","opening_balance_minor":"100"},{"name":"Cash","kind":"asset","opening_balance_minor":"200"}]}
      """
    When I send a POST to "/api/setup" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    Then the response status is 409
    And the response JSON matches the snapshot "post_api_setup__a_failed_opening_setup_leaves_no_partial_accounts_or_entries"
    And the store holds:
      | table          | count |
      | accounts       | 2     |
      | entries | 0     |
    And the database matches the snapshot "post_api_setup__rolled_back_opening_balances"
