Feature: Motorbike tariff
  The price signs only list car prices. Assumption for the simulation: a motorbike pays half of the
  car fee for the same stay (rounded to cents), under every tariff - day, night, Sunday and lost ticket.

  Scenario Outline: Motorbikes pay half of the weekday daytime tariff
    Given a motorbike enters the garage at "<entry>"
    When the motorbike leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 08:00 | 2026-11-05 08:30 | 0.30 |
      | 2026-11-05 08:00 | 2026-11-05 08:31 | 0.60 |
      | 2026-11-05 08:00 | 2026-11-05 09:01 | 1.00 |
      | 2026-11-05 08:00 | 2026-11-05 09:31 | 1.55 |
      | 2026-11-05 08:00 | 2026-11-05 14:30 | 6.50 |
      | 2026-11-05 08:00 | 2026-11-05 14:31 | 7.00 |

  Scenario Outline: Motorbikes pay half of the night tariff
    Given a motorbike enters the garage at "<entry>"
    When the motorbike leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-05 20:00 | 2026-11-05 20:30 | 0.30 |
      | 2026-11-05 20:00 | 2026-11-05 23:30 | 3.20 |
      | 2026-11-05 20:00 | 2026-11-05 23:31 | 3.50 |
      | 2026-11-05 22:00 | 2026-11-06 07:01 | 4.05 |
      | 2026-11-05 22:00 | 2026-11-06 10:30 | 7.00 |

  Scenario Outline: Motorbikes pay half of the Sunday tariff
    Given a motorbike enters the garage at "<entry>"
    When the motorbike leaves the garage at "<exit>"
    Then the parking fee is <fee> EUR

    Examples:
      | entry            | exit             | fee  |
      | 2026-11-08 10:00 | 2026-11-08 10:30 | 0.30 |
      | 2026-11-08 10:00 | 2026-11-08 13:31 | 3.50 |

  Scenario: A motorbike without a ticket pays half of the daily fee
    Given a motorbike has lost its parking ticket
    When the motorbike leaves the garage at "2026-11-05 09:00"
    Then the parking fee is 7.00 EUR

  Scenario: The running fee of a motorbike ticks up at half price
    Given a motorbike enters the garage at "2026-11-05 20:00"
    When the time is "2026-11-05 20:30"
    Then the current fee is 0.30 EUR
    When the time is "2026-11-05 21:30"
    Then the current fee is 1.00 EUR
    When the time is "2026-11-05 23:31"
    Then the current fee is 3.50 EUR
    When the motorbike leaves the garage at "2026-11-06 07:30"
    Then the parking fee is 4.05 EUR
