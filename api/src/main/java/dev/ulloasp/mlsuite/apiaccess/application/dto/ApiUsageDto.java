package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import jakarta.annotation.Nullable;

/**
 * The calls of a period: {@code day} (the last 24 hours, by hour), {@code week} or
 * {@code month} (the last 7 or 30 days, by UTC day). Calls are succeeded, {@code rejected}
 * (4xx) or {@code failed} (5xx); {@code runtimeBusy} counts the failed ones turned away for
 * want of a runtime slot. {@code p95DurationMs} covers succeeded calls and is null without any.
 * {@code month} is the organization's calendar month against its limit, and absent for the
 * platform. Calls older than {@code retentionDays} are no longer kept.
 */
public record ApiUsageDto(
        String period,
        OffsetDateTime since,
        long calls,
        long rejected,
        long failed,
        long runtimeBusy,
        @Nullable Double p95DurationMs,
        long activeClients,
        long activeOrganizations,
        List<ApiUsagePoint> series,
        List<ApiClientCalls> topClients,
        List<ApiRequestDto> recentFailures,
        @Nullable ApiUsageMonth month,
        int retentionDays) {

    public record ApiUsagePoint(OffsetDateTime start, long succeeded, long rejected, long failed) {
    }

    /** A client's calls in the period; the organization is named for the platform's view. */
    public record ApiClientCalls(Long clientId, String clientName, Long organizationId,
            @Nullable String organizationName, long calls, long errors) {
    }

    /** Succeeded calls this calendar month (UTC), the limit, and when the count starts again. */
    public record ApiUsageMonth(long calls, int limit, OffsetDateTime resetsAt) {
    }
}
