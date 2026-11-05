Feature: Night tariff (19:00 - 07:00) and Sunday/public holiday tariff (07:00 - 19:00)
  Price sign of the garage, "Nachttarif von 19:00 - 07:00 Uhr":
    - stay up to 1 hour:             0.60 EUR per started 30 minutes
    - stay over 1 hour to 1.5 hours: 0.80 EUR per started 30 minutes additionally
    - stay over 1.5 to 3.5 hours:    1.10 EUR per started 30 minutes additionally
    - stay over 3.5 hours:           7.00 EUR
    - leaving after 07:00: additionally 1.10 EUR per started 30 minutes of the day (max. 14.00 EUR per 24 hours)
  "Sonn- und Feiertagstarif von 07:00 - 19:00 Uhr": see night tariff;
    - leaving after 19:00: additionally 1.10 EUR per started 30 minutes of the night (max. 14.00 EUR per 24 hours)

  # 2026-11-05 is a Thursday, 2026-11-08 a Sunday, 2026-12-25 (Christmas Day) a public holiday on a Friday.

  Scenario Outline: Night tariff, up to 1 hour
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 20:00 | 2026-11-05 20:01 | 0.60 |
      | 2026-11-05 20:00 | 2026-11-05 20:30 | 0.60 |
      | 2026-11-05 20:00 | 2026-11-05 20:31 | 1.20 |
      | 2026-11-05 20:00 | 2026-11-05 21:00 | 1.20 |

  Scenario Outline: Night tariff, over 1 hour to 1.5 hours
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 20:00 | 2026-11-05 21:01 | 2.00 |
      | 2026-11-05 20:00 | 2026-11-05 21:30 | 2.00 |

  Scenario Outline: Night tariff, over 1.5 hours to 3.5 hours
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 20:00 | 2026-11-05 21:31 | 3.10 |
      | 2026-11-05 20:00 | 2026-11-05 22:00 | 3.10 |
      | 2026-11-05 20:00 | 2026-11-05 22:01 | 4.20 |
      | 2026-11-05 20:00 | 2026-11-05 23:30 | 6.40 |

  Scenario Outline: Night tariff, over 3.5 hours costs 7.00 EUR
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 20:00 | 2026-11-05 23:31 | 7.00 |
      | 2026-11-05 20:00 | 2026-11-06 02:00 | 7.00 |
      | 2026-11-05 22:00 | 2026-11-06 07:00 | 7.00 |

  Scenario Outline: Leaving after 07:00 adds 1.10 EUR per started 30 minutes of the day, max. 14.00 EUR
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee   |
      | 2026-11-05 22:00 | 2026-11-06 07:01 | 8.10  |
      | 2026-11-05 22:00 | 2026-11-06 07:30 | 8.10  |
      | 2026-11-05 22:00 | 2026-11-06 07:31 | 9.20  |
      | 2026-11-05 22:00 | 2026-11-06 10:00 | 13.60 |
      | 2026-11-05 22:00 | 2026-11-06 10:30 | 14.00 |
      | 2026-11-05 22:00 | 2026-11-06 18:00 | 14.00 |

  Scenario Outline: Sunday tariff follows the night tariff
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-08 10:00 | 2026-11-08 10:30 | 0.60 |
      | 2026-11-08 10:00 | 2026-11-08 11:00 | 1.20 |
      | 2026-11-08 10:00 | 2026-11-08 11:30 | 2.00 |
      | 2026-11-08 10:00 | 2026-11-08 13:30 | 6.40 |
      | 2026-11-08 10:00 | 2026-11-08 13:31 | 7.00 |

  Scenario Outline: Public holiday tariff follows the night tariff
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-12-25 10:00 | 2026-12-25 10:30 | 0.60 |
      | 2026-12-25 10:00 | 2026-12-25 13:31 | 7.00 |

  Scenario Outline: Leaving a Sunday after 19:00 adds 1.10 EUR per started 30 minutes of the night, max. 14.00 EUR
    Given a car enters the garage at "<entry>"
    When the car leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee   |
      | 2026-11-08 08:00 | 2026-11-08 19:01 | 8.10  |
      | 2026-11-08 08:00 | 2026-11-08 19:30 | 8.10  |
      | 2026-11-08 08:00 | 2026-11-08 19:31 | 9.20  |
      | 2026-11-08 08:00 | 2026-11-08 22:00 | 13.60 |
      | 2026-11-08 08:00 | 2026-11-08 22:30 | 14.00 |
      | 2026-11-08 08:00 | 2026-11-09 08:00 | 14.00 |
