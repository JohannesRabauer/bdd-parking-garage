package dev.rabauer.parkinggarage.web;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import dev.rabauer.parkinggarage.fee.Money;

public record FeeResponse(LocalDateTime entry, LocalDateTime exit, BigDecimal amount, String currency, String display) {

    static FeeResponse of(LocalDateTime entry, LocalDateTime exit, Money fee) {
        return new FeeResponse(entry, exit, fee.amount(), "EUR", fee.amount().toPlainString());
    }
}
