Feature: GET /api/analytics/categories
  One file per route: every scenario here calls GET /api/analytics/categories.

  Scenario: Expense is grouped by category
    Given a running API
    And the request body is:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{account:Unsorted}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    And I send a POST to "/api/entries" with headers/query:
      | type   | key          | value            |
      | header | Content-Type | application/json |
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-02-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_categories__expense_is_grouped_by_category"

  Scenario: An unknown kind is refused
    Given a running API
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key  | value   |
      | query | kind | neither |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_analytics_categories__an_unknown_kind_is_refused"

  Scenario: The parent roll-up sums a child into its root
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Food","kind":"expense"}
      """
    And the last ref is remembered as "food"
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"{{ref:food}}"}
      """
    And the last ref is remembered as "groceries"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{ref:groceries}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key    | value      |
      | query | from   | 2026-02-01 |
      | query | to     | 2026-02-28 |
      | query | rollup | parent     |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_categories__the_parent_roll_up_sums_a_child_into_its_root"

  Scenario: A child reports alone without the roll-up
    Given a running API
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Food","kind":"expense"}
      """
    And the last ref is remembered as "food"
    And I send a POST to "/api/accounts" with:
      """json
      {"name":"Groceries","kind":"expense","parent_ref":"{{ref:food}}"}
      """
    And the last ref is remembered as "groceries"
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-10","currency":"IDR","postings":[{"account_ref":"{{ref:groceries}}","amount_minor":"25000"},{"account_ref":"{{account:Cash}}","amount_minor":"-25000"}]}
      """
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key  | value      |
      | query | from | 2026-02-01 |
      | query | to   | 2026-02-28 |
    Then the response status is 200
    And the response JSON matches the snapshot "get_api_analytics_categories__a_child_reports_alone_without_the_roll_up"

  Scenario: An unknown roll-up is refused
    Given a running API
    When I send a GET to "/api/analytics/categories" with headers/query:
      | type  | key    | value  |
      | query | rollup | branch |
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_analytics_categories__an_unknown_roll_up_is_refused"

  Scenario: A category reports the first and the last day it moved
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-01-05","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-20","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2000"}]}
      """
    When I send a GET to "/api/analytics/categories?from=2026-01-01&to=2026-02-28"
    Then the response JSON matches the snapshot "get_api_analytics_categories__a_category_reports_the_first_and_the_last_day_it_moved"

  Scenario: The monthly bucket splits a category per month
    Given a running API
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-01-05","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-1000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"1000"}]}
      """
    And I send a POST to "/api/entries" with:
      """json
      {"occurred_on":"2026-02-20","currency":"IDR","postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-2000"},{"account_ref":"{{account:Unsorted}}","amount_minor":"2000"}]}
      """
    When I send a GET to "/api/analytics/categories?from=2026-01-01&to=2026-02-28&bucket=month"
    Then the response JSON matches the snapshot "get_api_analytics_categories__the_monthly_bucket_splits_a_category_per_month"

  Scenario: A bucket and a roll-up cannot be asked for together
    Given a running API
    When I send a GET to "/api/analytics/categories?bucket=month&rollup=parent"
    Then the response status is 422
    And the response JSON matches the snapshot "get_api_analytics_categories__a_bucket_and_a_roll_up_cannot_be_asked_for_together"
