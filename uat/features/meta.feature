Feature: Meta
  One round trip fills the shell: settings, accounts with derived balances, and the
  embedded currency list.

  Scenario: A fresh database bootstraps with the seeded accounts
    Given a running API
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON at "$.settings.base_currency" is "IDR"
    And the response JSON at "$.settings.extraction_enabled" is "false"
    And the response JSON at "$.accounts[0].name" is "Cash"
    And the response JSON at "$.accounts[0].kind" is "asset"
    And the response JSON at "$.accounts[0].base_amount_minor" is "0"
    And the response JSON at "$.accounts[1].name" is "Unsorted"

  Scenario: Balances come from postings, not from a stored column
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-14","currency":"IDR","postings":[{"account_id":2,"amount_minor":"25000"},{"account_id":1,"amount_minor":"-25000"}]}
      """
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON at "$.accounts[0].base_amount_minor" is "-25000"
    And the response JSON at "$.accounts[1].base_amount_minor" is "25000"

  Scenario: The currency list is embedded, not a table
    Given a running API
    When I send a GET to "/api/meta"
    Then the response status is 200
    And the response JSON at "$.currencies[0].code" is "AUD"
    And the response JSON at "$.currencies[0].minor_units" is "2"
