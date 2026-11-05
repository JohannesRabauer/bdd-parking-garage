package dev.rabauer.parkinggarage.fee;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * The real garage's tariffs, taken from its price signs. In all of them every started 30 minutes
 * is charged: the 1st and 2nd at 0.60 EUR, the 3rd at 0.80 EUR, the following ones at 1.10 EUR.
 * <ul>
 *     <li><b>Weekday daytime (07:00 - 19:00):</b> the slots up to 6.5 hours are charged as above;
 *     beyond that the daily fee of 14.00 EUR applies.</li>
 *     <li><b>Night (19:00 - 07:00) and Sundays/public holidays (07:00 - 19:00):</b> the slots up to
 *     3.5 hours are charged as above; beyond that 7.00 EUR flat. Staying past the end of that period
 *     (07:00 resp. 19:00) adds 1.10 EUR per started 30 minutes, at most 14.00 EUR per 24 hours.</li>
 * </ul>
 * The tariff is chosen by the entry time. Each full 24 hours is simply charged again.
 */
@Component
@Primary
public class GarageFeeCalculator implements FeeCalculator {

    static final Duration SLOT = Duration.ofMinutes(30);
    static final Money FIRST_HOUR_RATE = Money.euros("0.60");
    static final Money SECOND_HALF_HOUR_RATE = Money.euros("0.80");
    static final Money LONG_STAY_RATE = Money.euros("1.10");
    static final Money DAILY_FEE = Money.euros("14.00");
    static final Money NIGHT_FLAT_FEE = Money.euros("7.00");

    static final LocalTime DAY_START = LocalTime.of(7, 0);
    static final LocalTime NIGHT_START = LocalTime.of(19, 0);

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
        LocalDateTime partialEntry = entry.plusDays(fullDays);
        return total.plus(feeForPartialDay(partialEntry, exit));
    }

    private static Money feeForPartialDay(LocalDateTime entry, LocalDateTime exit) {
        LocalTime time = entry.toLocalTime();
        boolean daytime = !time.isBefore(DAY_START) && time.isBefore(NIGHT_START);
        if (daytime && !PublicHolidays.isSundayOrHoliday(entry.toLocalDate())) {
            return slotsFee(Duration.between(entry, exit)).min(DAILY_FEE);
        }
        return nightStyleFee(entry, exit, endOfPeriod(entry, daytime));
    }

    /** Night tariff, also used on Sundays and holidays during the day: it runs until {@code periodEnd}. */
    private static Money nightStyleFee(LocalDateTime entry, LocalDateTime exit, LocalDateTime periodEnd) {
        LocalDateTime insideEnd = exit.isBefore(periodEnd) ? exit : periodEnd;
        Money inside = slotsFee(Duration.between(entry, insideEnd)).min(NIGHT_FLAT_FEE);

        Money after = Money.ZERO;
        if (exit.isAfter(periodEnd)) {
            long slots = startedSlots(Duration.between(periodEnd, exit));
            for (long slot = 0; slot < slots; slot++) {
                after = after.plus(LONG_STAY_RATE);
            }
        }
        return inside.plus(after).min(DAILY_FEE);
    }

    private static LocalDateTime endOfPeriod(LocalDateTime entry, boolean daytime) {
        LocalDate date = entry.toLocalDate();
        if (daytime) {
            return date.atTime(NIGHT_START);
        }
        return entry.toLocalTime().isBefore(DAY_START)
                ? date.atTime(DAY_START)
                : date.plusDays(1).atTime(DAY_START);
    }

    private static Money slotsFee(Duration stay) {
        long slots = startedSlots(stay);
        Money total = Money.ZERO;
        for (long slot = 1; slot <= slots; slot++) {
            total = total.plus(rateOfSlot(slot));
        }
        return total;
    }

    private static long startedSlots(Duration stay) {
        return (stay.toSeconds() + SLOT.toSeconds() - 1) / SLOT.toSeconds();
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
