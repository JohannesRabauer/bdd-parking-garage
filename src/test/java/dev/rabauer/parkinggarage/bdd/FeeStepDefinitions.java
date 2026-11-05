package dev.rabauer.parkinggarage.bdd;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import dev.rabauer.parkinggarage.fee.GarageFeeCalculator;
import dev.rabauer.parkinggarage.fee.FeeCalculator;
import dev.rabauer.parkinggarage.fee.Money;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class FeeStepDefinitions {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FeeCalculator calculator = new GarageFeeCalculator();
    private LocalDateTime entry;
    private LocalDateTime now;
    private Money fee;

    @Given("a car enters the garage at {string}")
    public void aCarEntersTheGarageAt(String time) {
        entry = LocalDateTime.parse(time, FORMAT);
    }

    @When("the car leaves the garage at {string}")
    public void theCarLeavesTheGarageAt(String time) {
        LocalDateTime exit = LocalDateTime.parse(time, FORMAT);
        fee = entry == null ? calculator.calculateWithoutTicket(exit) : calculator.calculate(entry, exit);
    }

    @Given("a car has lost its parking ticket")
    public void aCarHasLostItsParkingTicket() {
        entry = null;
    }

    @When("the time is {string}")
    public void theTimeIs(String time) {
        now = LocalDateTime.parse(time, FORMAT);
    }

    @Then("the current fee is {bigdecimal} EUR")
    public void theCurrentFeeIs(BigDecimal expected) {
        assertEquals(new Money(expected), calculator.calculate(entry, now));
    }

    @Then("the parking fee is {bigdecimal} EUR")
    public void theParkingFeeIs(BigDecimal expected) {
        assertEquals(new Money(expected), fee);
    }
}
