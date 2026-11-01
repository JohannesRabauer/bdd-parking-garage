package com.github.johannesrabauer.parkinggarage.web;

import java.time.LocalDateTime;

public record CheckoutRequest(LocalDateTime entry, LocalDateTime exit) {
}
