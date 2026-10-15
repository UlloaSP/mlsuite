package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiCaller;

/**
 * How many calls a client may make: a number per clock minute for each client, and a number of
 * succeeded calls per calendar month (UTC) for all of an organization's clients together. Both
 * are counted from the request log, so they hold across restarts and API instances. A call is
 * logged when it ends, so calls still running are not counted yet; the runtime slots bound how
 * many those can be.
 */
@Component
@Transactional(readOnly = true)
public class ApiCallLimits {

    private final ApiRequestRepository requests;
    private final ApiAccessSettings settings;
    private final Clock clock;

    @Autowired
    public ApiCallLimits(ApiRequestRepository requests, ApiAccessSettings settings) {
        this(requests, settings, Clock.systemUTC());
    }

    ApiCallLimits(ApiRequestRepository requests, ApiAccessSettings settings, Clock clock) {
        this.requests = requests;
        this.settings = settings;
        this.clock = clock;
    }

    /** Refuses the call when the client's minute or its organization's month is used up. */
    public void admit(ApiCaller caller) {
        Instant now = clock.instant();
        OffsetDateTime minute = now.truncatedTo(ChronoUnit.MINUTES).atOffset(ZoneOffset.UTC);
        int perMinute = settings.requestsPerMinute();
        if (requests.countByClientIdAndCreatedAtGreaterThanEqual(caller.clientId(), minute) >= perMinute) {
            throw new ApiProblem(ApiErrorCode.RATE_LIMITED,
                    "This client may make %d calls a minute.".formatted(perMinute),
                    secondsUntil(now, minute.plusMinutes(1)));
        }
        OffsetDateTime month = monthStart(now);
        int limit = settings.monthlyLimit(caller.monthlyCallLimit());
        if (requests.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(caller.organizationId(), 200,
                month) >= limit) {
            throw new ApiProblem(ApiErrorCode.QUOTA_EXCEEDED,
                    "The organization's clients have made the %d calls allowed this month.".formatted(limit),
                    secondsUntil(now, month.plusMonths(1)));
        }
    }

    /** The first instant of the calendar month (UTC) that holds {@code now}. */
    public static OffsetDateTime monthStart(Instant now) {
        return now.atOffset(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS).with(TemporalAdjusters.firstDayOfMonth());
    }

    private static long secondsUntil(Instant now, OffsetDateTime then) {
        long millis = Duration.between(now, then.toInstant()).toMillis();
        return Math.max(1, (millis + 999) / 1000);
    }
}
