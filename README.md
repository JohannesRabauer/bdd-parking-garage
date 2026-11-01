# bdd-parking-garage

Top-down pixel parking garage simulator (Spring Boot), built for the JUG Oberpfalz live-coding session "I Quit BDD Once. This Time the AI Writes the Glue" on 5 November 2026.

Cars drive in, take a ticket, park, watch their fee tick up, drive to the exit, pay and leave. Every price shown on screen comes from a Java `FeeCalculator`. Right now that's a placeholder (`DummyFeeCalculator`); during the session it gets replaced by a calculator developed test-first from a real garage's price sign.

## Run it

Requires Java 21 or newer.

```bash
./mvnw spring-boot:run
```

On Windows: `mvnw.cmd spring-boot:run`

Then open http://localhost:8080.

Controls (buttons at the bottom or keyboard):

| Key   | Action                               |
|-------|--------------------------------------|
| Space | pause / resume                       |
| 1     | 1 simulated minute per second        |
| 2     | 10 simulated minutes per second      |
| 3     | 1 simulated hour per second          |
| C     | send an extra car to the entry       |
| click | select a car and follow its ticket   |

## Where the fee logic lives

```
src/main/java/com/github/johannesrabauer/parkinggarage/
├── fee/
│   ├── FeeCalculator.java        <- the interface the simulator depends on
│   ├── DummyFeeCalculator.java   <- placeholder rules (the only @Component implementation)
│   └── Money.java                <- euro amount, always 2 decimals
└── web/
    └── FeeController.java        <- REST endpoints, stateless
```

```java
public interface FeeCalculator {
    Money calculate(LocalDateTime entry, LocalDateTime exit);
}
```

To plug in a real implementation, register another bean of this type and either mark it `@Primary` or remove `@Component` from `DummyFeeCalculator`. Nothing else has to change: the frontend contains no price logic.

The dummy rules, so you can tell them apart from the real ones: first 30 minutes free, 1.50 EUR per started hour (0.50 EUR if the hour starts between 22:00 and 06:00), each started 24 hours capped at 12.00 EUR.

## REST API

The simulated clock lives in the browser. The backend keeps no time state; every request carries both timestamps (ISO local date-time, no zone).

```
GET  /api/fee?entry=2026-11-05T09:00:00&at=2026-11-05T10:15:00     running fee of a parked car
POST /api/checkout  {"entry": "2026-11-05T09:00:00", "exit": "2026-11-05T09:45:00"}   final fee at the exit barrier
```

Both return:

```json
{"entry": "2026-11-05T09:00:00", "exit": "2026-11-05T10:15:00", "amount": 3.00, "currency": "EUR", "display": "3.00"}
```

`exit` before `entry` returns `400 Bad Request`.

## Frontend

Plain JavaScript modules, no build step, under `src/main/resources/static`:

- `js/garage.js`: layout, simulated clock, car traffic, rendering
- `js/sprites.js`: car and coin pixel sprites, drawn in code
- `js/font.js`: 3x5 bitmap font
- `js/api.js`: the only code that talks to the backend

Everything is drawn on a 480x270 canvas and scaled up with `image-rendering: pixelated`.
For debugging, `window.garage` exposes the state; `garage.step(seconds)` advances the simulation by hand.

## Tests

```bash
./mvnw test
```

Plain JUnit 5 tests for the dummy calculator and the endpoints. The BDD/Cucumber part is intentionally missing; it gets built live on stream.
