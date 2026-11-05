Feature: Running fee during a stay
  While a car is parked, the fee shown on screen follows the tariff as time passes.

  Scenario: The running fee follows the night tariff
    Given a car enters the garage at "2026-11-05 20:00"
    When the time is "2026-11-05 20:30"
    Then the current fee is 0.60 EUR
    When the time is "2026-11-05 21:30"
    Then the current fee is 2.00 EUR
    When the time is "2026-11-05 23:31"
    Then the current fee is 7.00 EUR
    When the car leaves the garage at "2026-11-06 07:30"
    Then the parking fee is 8.10 EUR
