package dev.rabauer.parkinggarage.web;

import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.rabauer.parkinggarage.fee.FeeCalculator;
import dev.rabauer.parkinggarage.fee.VehicleType;

/**
 * Stateless: the simulated clock lives in the browser, which sends both timestamps with every request.
 */
@RestController
@RequestMapping("/api")
public class FeeController {

    private final FeeCalculator feeCalculator;

    public FeeController(FeeCalculator feeCalculator) {
        this.feeCalculator = feeCalculator;
    }

    /** Running fee of a car that is still in the garage. */
    @GetMapping("/fee")
    public FeeResponse currentFee(
            @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime entry,
            @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) LocalDateTime at,
            @RequestParam(defaultValue = "CAR") VehicleType vehicle) {
        return FeeResponse.of(entry, at, feeCalculator.calculate(vehicle, entry, at));
    }

    /** Final fee, paid at the exit barrier. Without an {@code entry} the ticket was lost. */
    @PostMapping("/checkout")
    public FeeResponse checkout(@RequestBody CheckoutRequest request) {
        if (request.exit() == null) {
            throw new IllegalArgumentException("exit is required");
        }
        VehicleType vehicle = request.vehicle() == null ? VehicleType.CAR : request.vehicle();
        if (request.entry() == null) {
            return FeeResponse.of(null, request.exit(),
                    feeCalculator.calculateWithoutTicket(vehicle, request.exit()));
        }
        return FeeResponse.of(request.entry(), request.exit(),
                feeCalculator.calculate(vehicle, request.entry(), request.exit()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail badRequest(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
