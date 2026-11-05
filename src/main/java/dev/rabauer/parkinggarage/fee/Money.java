package dev.rabauer.parkinggarage.fee;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * An amount in euros, always kept with two decimal places.
 */
public record Money(BigDecimal amount) implements Comparable<Money> {

    public static final Money ZERO = euros("0");

    public Money {
        Objects.requireNonNull(amount, "amount");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static Money euros(String amount) {
        return new Money(new BigDecimal(amount));
    }

    public Money plus(Money other) {
        return new Money(amount.add(other.amount));
    }

    /** Multiplies by a factor, rounded to cents. */
    public Money times(String factor) {
        return new Money(amount.multiply(new BigDecimal(factor)));
    }

    public Money min(Money other) {
        return compareTo(other) <= 0 ? this : other;
    }

    @Override
    public int compareTo(Money other) {
        return amount.compareTo(other.amount);
    }

    @Override
    public String toString() {
        return amount.toPlainString() + " EUR";
    }
}
