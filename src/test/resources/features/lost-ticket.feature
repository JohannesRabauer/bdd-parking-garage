Feature: Lost parking ticket (Parkscheinverlust)
  Price sign: "Bitte haben Sie Verständnis, dass wir beim Verlust des Parkscheins mindestens eine
  Tagesgebühr von 14,00 Euro berechnen müssen."
  Without a ticket the entry time is unknown, so the daily fee is charged.

  Scenario Outline: A car without a ticket pays at least the daily fee
    Given a car has lost its parking ticket
    When the car leaves the garage at "<exit>"
    Then the parking fee is 14.00 EUR

    Examples:
      | exit             |
      | 2026-11-05 09:00 |
      | 2026-11-05 23:30 |
      | 2026-11-08 12:00 |
