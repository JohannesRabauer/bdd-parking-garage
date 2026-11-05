package dev.rabauer.parkinggarage.bdd;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import dev.rabauer.parkinggarage.fee.FeeCalculator;
import dev.rabauer.parkinggarage.fee.GarageFeeCalculator;
import dev.rabauer.parkinggarage.fee.Money;
import dev.rabauer.parkinggarage.fee.VehicleType;
import io.cucumber.java.ParameterType;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class FeeStepDefinitions {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FeeCalculator calculator = new GarageFeeCalculator();
    private VehicleType vehicle = VehicleType.CAR;
    private LocalDateTime entry;
    private LocalDateTime now;
    private Money fee;

    @ParameterType("car|motorbike")
    public VehicleType vehicle(String name) {
        return VehicleType.valueOf(name.toUpperCase(Locale.ROOT));
    }

    @Given("a {vehicle} enters the garage at {string}")
    public void aVehicleEntersTheGarageAt(VehicleType vehicle, String time) {
        this.vehicle = vehicle;
        entry = LocalDateTime.parse(time, FORMAT);
    }

    @Given("a {vehicle} has lost its parking ticket")
    public void aVehicleHasLostItsParkingTicket(VehicleType vehicle) {
        this.vehicle = vehicle;
        entry = null;
    }

    @When("the {vehicle} leaves the garage at {string}")
    public void theVehicleLeavesTheGarageAt(VehicleType ignored, String time) {
        LocalDateTime exit = LocalDateTime.parse(time, FORMAT);
        fee = entry == null
                ? calculator.calculateWithoutTicket(vehicle, exit)
                : calculator.calculate(vehicle, entry, exit);
    }

    @When("the time is {string}")
    public void theTimeIs(String time) {
        now = LocalDateTime.parse(time, FORMAT);
    }

    @Then("the current fee is {bigdecimal} EUR")
    public void theCurrentFeeIs(BigDecimal expected) {
        assertEquals(new Money(expected), calculator.calculate(vehicle, entry, now));
    }

    @Then("the parking fee is {bigdecimal} EUR")
    public void theParkingFeeIs(BigDecimal expected) {
        assertEquals(new Money(expected), fee);
    }
}
