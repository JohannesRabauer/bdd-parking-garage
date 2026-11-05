Feature: Day rate per hour
  During the day every started hour is charged at the day rate.

  Scenario Outline: Parking during the day is charged per started hour
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 09:00 | 2026-11-05 10:00 | 1.50 |
      | 2026-11-05 09:00 | 2026-11-05 10:01 | 3.00 |
      | 2026-11-05 09:00 | 2026-11-05 12:00 | 4.50 |
