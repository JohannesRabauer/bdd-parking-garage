Feature: Night rate per hour
  Every started hour that begins between 22:00 and 06:00 is charged at the night rate.

  Scenario Outline: Parking at night is charged per started hour
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 23:00 | 2026-11-06 00:00 | 0.50 |
      | 2026-11-05 23:00 | 2026-11-06 00:01 | 1.00 |
      | 2026-11-05 23:00 | 2026-11-06 02:00 | 1.50 |
      | 2026-11-06 02:00 | 2026-11-06 05:00 | 1.50 |

  Scenario Outline: The rate switches with the hour a started hour begins in
    Given a car enters the garage at "<entry1>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry1           | exit             | fee  |
      | 2026-11-05 21:00 | 2026-11-05 23:00 | 2.00 |
      | 2026-11-06 05:00 | 2026-11-06 07:00 | 2.00 |
