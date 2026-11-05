package dev.rabauer.parkinggarage.web;

import java.time.LocalDateTime;

import dev.rabauer.parkinggarage.fee.VehicleType;

/** {@code entry} is null when the ticket was lost; {@code vehicle} defaults to a car. */
public record CheckoutRequest(LocalDateTime entry, LocalDateTime exit, VehicleType vehicle) {
}
