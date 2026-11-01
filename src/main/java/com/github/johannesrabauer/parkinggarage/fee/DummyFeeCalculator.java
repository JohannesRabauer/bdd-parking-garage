package com.github.johannesrabauer.parkinggarage.fee;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.stereotype.Component;

/**
 * Placeholder rules so the simulator has something to show. These are NOT the real garage's prices.
 * <ul>
 *     <li>the first 30 minutes are free</li>
 *     <li>otherwise every started hour costs 1.50 EUR, or 0.50 EUR if it starts between 22:00 and 06:00</li>
 *     <li>every started 24 hours are capped at 12.00 EUR</li>
 * </ul>
 */
@Component
public class DummyFeeCalculator implements FeeCalculator {

    static final Duration FREE_PERIOD = Duration.ofMinutes(30);
    static final Money DAY_RATE = Money.euros("1.50");
    static final Money NIGHT_RATE = Money.euros("0.50");
    static final Money DAILY_CAP = Money.euros("12.00");
    static final LocalTime NIGHT_START = LocalTime.of(22, 0);
    static final LocalTime NIGHT_END = LocalTime.of(6, 0);

    @Override
    public Money calculate(LocalDateTime entry, LocalDateTime exit) {
        if (exit.isBefore(entry)) {
            throw new IllegalArgumentException("exit " + exit + " is before entry " + entry);
        }
        Duration stay = Duration.between(entry, exit);
        if (stay.compareTo(FREE_PERIOD) <= 0) {
            return Money.ZERO;
        }

        long startedHours = (stay.toSeconds() + 3599) / 3600;
        Money total = Money.ZERO;
        Money currentDay = Money.ZERO;
        for (long hour = 0; hour < startedHours; hour++) {
            if (hour > 0 && hour % 24 == 0) {
                total = total.plus(currentDay.min(DAILY_CAP));
                currentDay = Money.ZERO;
            }
            currentDay = currentDay.plus(rateFor(entry.plusHours(hour).toLocalTime()));
        }
        return total.plus(currentDay.min(DAILY_CAP));
    }

    private static Money rateFor(LocalTime hourStart) {
        boolean night = !hourStart.isBefore(NIGHT_START) || hourStart.isBefore(NIGHT_END);
        return night ? NIGHT_RATE : DAY_RATE;
    }
}
