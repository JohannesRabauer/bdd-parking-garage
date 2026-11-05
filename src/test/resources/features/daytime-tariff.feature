Feature: Daytime tariff (07:00 - 19:00)
  Price sign of the garage, "Parken tagsüber von 07:00 - 19:00 Uhr":
    - stay up to 1 hour:            0.60 EUR per started 30 minutes
    - stay over 1 hour to 1.5 hours: 0.80 EUR per started 30 minutes additionally
    - stay over 1.5 to 6.5 hours:    1.10 EUR per started 30 minutes additionally
    - daily fee (over 6.5 - 24 hours): 14.00 EUR

  Scenario Outline: Up to 1 hour, 0.60 EUR per started 30 minutes
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 08:00 | 2026-11-05 08:01 | 0.60 |
      | 2026-11-05 08:00 | 2026-11-05 08:30 | 0.60 |
      | 2026-11-05 08:00 | 2026-11-05 08:31 | 1.20 |
      | 2026-11-05 08:00 | 2026-11-05 09:00 | 1.20 |

  Scenario Outline: Over 1 hour to 1.5 hours, 0.80 EUR per additional started 30 minutes
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 08:00 | 2026-11-05 09:01 | 2.00 |
      | 2026-11-05 08:00 | 2026-11-05 09:30 | 2.00 |

  Scenario Outline: Over 1.5 hours to 6.5 hours, 1.10 EUR per additional started 30 minutes
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee   |
      | 2026-11-05 08:00 | 2026-11-05 09:31 | 3.10  |
      | 2026-11-05 08:00 | 2026-11-05 10:00 | 3.10  |
      | 2026-11-05 08:00 | 2026-11-05 10:01 | 4.20  |
      | 2026-11-05 08:00 | 2026-11-05 14:30 | 13.00 |

  Scenario Outline: Over 6.5 hours the daily fee applies
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee   |
      | 2026-11-05 08:00 | 2026-11-05 14:31 | 14.00 |
      | 2026-11-05 08:00 | 2026-11-05 15:00 | 14.00 |
      | 2026-11-05 08:00 | 2026-11-05 18:00 | 14.00 |
