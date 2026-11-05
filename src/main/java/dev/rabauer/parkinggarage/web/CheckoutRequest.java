package dev.rabauer.parkinggarage.web;

import java.time.LocalDateTime;

public record CheckoutRequest(LocalDateTime entry, LocalDateTime exit) {
}
