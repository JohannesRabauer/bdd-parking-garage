package com.github.johannesrabauer.parkinggarage.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.github.johannesrabauer.parkinggarage.fee.DummyFeeCalculator;

@WebMvcTest(FeeController.class)
@Import(DummyFeeCalculator.class)
class FeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsTheRunningFee() throws Exception {
        mockMvc.perform(get("/api/fee")
                        .param("entry", "2026-11-05T09:00:00")
                        .param("at", "2026-11-05T10:15:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.display").value("3.00"))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andExpect(jsonPath("$.exit").value("2026-11-05T10:15:00"));
    }

    @Test
    void returnsTheFinalFeeOnCheckout() throws Exception {
        mockMvc.perform(post("/api/checkout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"entry": "2026-11-05T09:00:00", "exit": "2026-11-05T09:45:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(1.5))
                .andExpect(jsonPath("$.display").value("1.50"));
    }

    @Test
    void rejectsExitBeforeEntry() throws Exception {
        mockMvc.perform(get("/api/fee")
                        .param("entry", "2026-11-05T09:00:00")
                        .param("at", "2026-11-05T08:00:00"))
                .andExpect(status().isBadRequest());
    }
}
