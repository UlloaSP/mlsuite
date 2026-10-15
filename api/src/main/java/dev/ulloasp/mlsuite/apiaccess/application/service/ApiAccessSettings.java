package dev.ulloasp.mlsuite.apiaccess.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The instance's limits for API clients. The month is counted from the kept calls, so they are
 * kept at least as long as the longest month.
 */
@Component
public class ApiAccessSettings {

    static final int MIN_RETENTION_DAYS = 31;

    private final int requestsPerMinute;
    private final int monthlyCalls;
    private final int retentionDays;

    public ApiAccessSettings(
            @Value("${mlsuite.api-access.requests-per-minute}") int requestsPerMinute,
            @Value("${mlsuite.api-access.monthly-calls}") int monthlyCalls,
            @Value("${mlsuite.api-access.request-retention-days}") int retentionDays) {
        if (requestsPerMinute < 1) {
            throw new IllegalArgumentException("API_ACCESS_REQUESTS_PER_MINUTE must be at least 1.");
        }
        if (monthlyCalls < 0) {
            throw new IllegalArgumentException("API_ACCESS_MONTHLY_CALLS must not be negative.");
        }
        if (retentionDays < MIN_RETENTION_DAYS) {
            throw new IllegalArgumentException(
                    "API_ACCESS_REQUEST_RETENTION_DAYS must be at least %d.".formatted(MIN_RETENTION_DAYS));
        }
        this.requestsPerMinute = requestsPerMinute;
        this.monthlyCalls = monthlyCalls;
        this.retentionDays = retentionDays;
    }

    public int requestsPerMinute() {
        return requestsPerMinute;
    }

    /** An organization's monthly limit: its own when a superadmin set one, the default otherwise. */
    public int monthlyLimit(Integer own) {
        return own == null ? monthlyCalls : own;
    }

    public int retentionDays() {
        return retentionDays;
    }
}
