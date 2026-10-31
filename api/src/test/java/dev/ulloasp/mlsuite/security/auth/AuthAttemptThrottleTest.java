package dev.ulloasp.mlsuite.security.auth;

import static org.hamcrest.Matchers.matchesRegex;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import org.hamcrest.Matcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.security.identity.ClientNetworks;

/**
 * Failed sign-ins and registration attempts are limited per network (3 and 2 here) for 15 minutes;
 * past the limit the API answers 429 with Retry-After.
 */
class AuthAttemptThrottleTest extends AuthHttpFixture {

    /** Whole seconds, rounded up, of a window that started moments before: 1 to 900. */
    private static final Matcher<String> WITHIN_THE_WINDOW = matchesRegex("[1-9]|[1-9][0-9]|[1-8][0-9][0-9]|900");

    @Test
    void repeatedFailedSignInsAreRefusedEvenWithTheRightPassword() throws Exception {
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(login("wrong-password-" + i)).andExpect(status().isUnauthorized());
        }

        mockMvc.perform(login("wrong-password-again"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", WITHIN_THE_WINDOW))
                .andExpect(jsonPath("$.message").value(
                        "Too many failed sign-in attempts from your network. Try again later."));
        mockMvc.perform(login(PASSWORD)).andExpect(status().isTooManyRequests());
    }

    @Test
    void failuresCountOnlyAgainstTheirOwnNetwork() throws Exception {
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(login("wrong-password")).andExpect(status().isUnauthorized());
        }
        network = "test-network-" + UUID.randomUUID();

        mockMvc.perform(login(PASSWORD)).andExpect(status().isOk());
    }

    @Test
    void successfulSignInsAreNotCountedAndDoNotResetFailures() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(login(PASSWORD)).andExpect(status().isOk());
        }
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(login("wrong-password")).andExpect(status().isUnauthorized());
        }
        mockMvc.perform(login(PASSWORD)).andExpect(status().isOk());
        mockMvc.perform(login("wrong-password")).andExpect(status().isUnauthorized());

        mockMvc.perform(login(PASSWORD)).andExpect(status().isTooManyRequests());
    }

    @Test
    void repeatedRegistrationAttemptsAreRefused() throws Exception {
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(true);
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(register()).andExpect(status().isConflict());
        }

        mockMvc.perform(register())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", WITHIN_THE_WINDOW))
                .andExpect(jsonPath("$.message").value(
                        "Too many registration attempts from your network. Try again later."));
    }

    @Test
    void attemptsAreAllowedAgainOnceTheWindowEnds() {
        MutableClock clock = new MutableClock();
        AuthAttemptLimiter limiter = new AuthAttemptLimiter(1, 1, clock);
        limiter.recordLoginFailure("address:a");
        limiter.admitRegistration("address:a");

        clock.advance(Duration.ofMinutes(10));
        var refused = assertThrows(AuthAttemptLimitException.class, () -> limiter.checkLogin("address:a"));
        assertEquals(Duration.ofMinutes(5), refused.getRetryAfter());
        assertThrows(AuthAttemptLimitException.class, () -> limiter.admitRegistration("address:a"));

        clock.advance(Duration.ofMinutes(5));
        limiter.checkLogin("address:a");
        limiter.admitRegistration("address:a");
    }

    @Test
    void limitsBelowOneAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> new AuthAttemptLimiter(0, 5, Clock.systemUTC()));
        assertThrows(IllegalArgumentException.class, () -> new AuthAttemptLimiter(10, 0, Clock.systemUTC()));
    }

    private MockHttpServletRequestBuilder register() {
        return post("/api/auth/register")
                .header(ClientNetworks.CLIENT_ADDRESS_HEADER, network)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"taken@example.com\",\"password\":\"long-enough-password\",\"username\":\"taken\"}");
    }

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }
}
