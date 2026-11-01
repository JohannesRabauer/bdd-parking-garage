package com.github.johannesrabauer.parkinggarage.fee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

class DummyFeeCalculatorTest {

    private final DummyFeeCalculator calculator = new DummyFeeCalculator();
    private final LocalDateTime morning = LocalDateTime.of(2026, 11, 5, 9, 0);

    @Test
    void firstThirtyMinutesAreFree() {
        assertThat(calculator.calculate(morning, morning.plusMinutes(30))).isEqualTo(Money.ZERO);
    }

    @Test
    void everyStartedHourCostsTheDayRate() {
        assertThat(calculator.calculate(morning, morning.plusMinutes(31))).isEqualTo(Money.euros("1.50"));
        assertThat(calculator.calculate(morning, morning.plusMinutes(61))).isEqualTo(Money.euros("3.00"));
    }

    @Test
    void hoursStartingAtNightAreCheaper() {
        LocalDateTime evening = LocalDateTime.of(2026, 11, 5, 21, 0);
        assertThat(calculator.calculate(evening, evening.plusHours(3))).isEqualTo(Money.euros("2.50"));
    }

    @Test
    void everyStartedDayIsCapped() {
        assertThat(calculator.calculate(morning, morning.plusHours(23))).isEqualTo(Money.euros("12.00"));
        assertThat(calculator.calculate(morning, morning.plusHours(25))).isEqualTo(Money.euros("13.50"));
    }

    @Test
    void exitBeforeEntryIsRejected() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> calculator.calculate(morning, morning.minusMinutes(1)));
    }
}
