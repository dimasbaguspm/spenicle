Feature: Boot
  The process itself, not a route: an unusable data path or a database that cannot be
  migrated stops the boot instead of serving a half-ready API.

  Scenario: A database path that cannot hold a file stops the boot
    Given the database path is a directory
    When I boot the API
    Then the boot fails
    And the boot failure mentions "open"

  Scenario: A database that cannot be migrated stops the boot
    Given the database file holds a foreign schema_migrations table
    When I boot the API
    Then the boot fails
    And the boot failure mentions "schema_migrations"
