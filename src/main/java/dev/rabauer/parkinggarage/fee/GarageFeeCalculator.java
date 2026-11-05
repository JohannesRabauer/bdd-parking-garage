package dev.rabauer.parkinggarage.fee;

import java.time.Duration;
import java.time.LocalDateTime;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * The real garage's daytime tariff (07:00 - 19:00), taken from its price sign. Every started
 * 30 minutes is charged:
 * <ul>
 *     <li>1st and 2nd (stay up to 1 hour): 0.60 EUR each</li>
 *     <li>3rd (stay over 1 hour to 1.5 hours): 0.80 EUR</li>
 *     <li>4th to 13th (stay over 1.5 hours to 6.5 hours): 1.10 EUR each</li>
 * </ul>
 * Beyond 6.5 hours the daily fee of 14.00 EUR applies instead (up to 24 hours).
 * <p>
 * Not covered by the sign yet, so not modelled: night pricing, and stays longer than 24 hours
 * (each full 24 hours is simply charged the daily fee again).
 */
@Component
@Primary
public class GarageFeeCalculator implements FeeCalculator {

    static final Duration SLOT = Duration.ofMinutes(30);
    static final Money FIRST_HOUR_RATE = Money.euros("0.60");
    static final Money SECOND_HALF_HOUR_RATE = Money.euros("0.80");
    static final Money LONG_STAY_RATE = Money.euros("1.10");
    static final Money DAILY_FEE = Money.euros("14.00");

    private static final int FIRST_HOUR_SLOTS = 2;
    private static final int SLOTS_UP_TO_1_5_HOURS = 3;

    @Override
    public Money calculate(LocalDateTime entry, LocalDateTime exit) {
        if (exit.isBefore(entry)) {
            throw new IllegalArgumentException("exit " + exit + " is before entry " + entry);
        }
        Duration stay = Duration.between(entry, exit);
        long fullDays = stay.toDays();
        Money total = Money.ZERO;
        for (long day = 0; day < fullDays; day++) {
            total = total.plus(DAILY_FEE);
        }
        return total.plus(feeForPartialDay(stay.minusDays(fullDays)));
    }

    private static Money feeForPartialDay(Duration stay) {
        long startedSlots = (stay.toSeconds() + SLOT.toSeconds() - 1) / SLOT.toSeconds();
        Money total = Money.ZERO;
        for (long slot = 1; slot <= startedSlots; slot++) {
            total = total.plus(rateOfSlot(slot));
        }
        return total.min(DAILY_FEE);
    }

    private static Money rateOfSlot(long slot) {
        if (slot <= FIRST_HOUR_SLOTS) {
            return FIRST_HOUR_RATE;
        }
        if (slot <= SLOTS_UP_TO_1_5_HOURS) {
            return SECOND_HALF_HOUR_RATE;
        }
        return LONG_STAY_RATE;
    }
}
