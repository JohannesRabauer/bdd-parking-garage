package dev.rabauer.parkinggarage.fee;

import java.time.LocalDateTime;

/**
 * Calculates the parking fee for a stay in the garage.
 * <p>
 * This is the seam of the simulator: the frontend only ever asks this interface for a price.
 * Swap in a real implementation by registering another bean of this type
 * (mark it {@code @Primary}, or remove {@code @Component} from {@link DummyFeeCalculator}).
 */
public interface FeeCalculator {

    /**
     * @param entry when the car passed the entry barrier
     * @param exit  when the car pays at the exit barrier (or "now" for a running fee); never before {@code entry}
     * @return the fee for this stay
     */
    Money calculate(LocalDateTime entry, LocalDateTime exit);
}
