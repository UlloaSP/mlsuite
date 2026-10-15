package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiUsageBucket;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiUsageTotals;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiRequestDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;

/**
 * Reads the request log as usage, for an organization (or one of its clients) or for the whole
 * platform. Every hour or day of the period is given, with zeros where no call was made.
 */
@Component
class ApiUsageReader {

    private static final int TOP_FAILURES = 5;

    private final ApiRequestRepository requests;
    private final OrganizationRepository organizations;
    private final ApiAccessSettings settings;
    private final Clock clock;

    @Autowired
    ApiUsageReader(ApiRequestRepository requests, OrganizationRepository organizations, ApiAccessSettings settings) {
        this(requests, organizations, settings, Clock.systemUTC());
    }

    ApiUsageReader(ApiRequestRepository requests, OrganizationRepository organizations, ApiAccessSettings settings,
            Clock clock) {
        this.requests = requests;
        this.organizations = organizations;
        this.settings = settings;
        this.clock = clock;
    }

    private record Period(ChronoUnit unit, int buckets) {
    }

    /** {@code organization} is null for the platform, which is not shown a month. */
    ApiUsageDto read(String period, Organization organization, Long clientId) {
        Period shape = switch (period == null ? "day" : period) {
            case "day" -> new Period(ChronoUnit.HOURS, 24);
            case "week" -> new Period(ChronoUnit.DAYS, 7);
            case "month" -> new Period(ChronoUnit.DAYS, 30);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Period must be day, week or month.");
        };
        Instant now = clock.instant();
        Duration step = shape.unit().getDuration();
        Instant first = now.truncatedTo(shape.unit()).minus(step.multipliedBy(shape.buckets() - 1L));
        OffsetDateTime since = first.atOffset(ZoneOffset.UTC);
        Long organizationId = organization == null ? null : organization.getId();

        ApiUsageTotals totals = requests.totals(organizationId, clientId, since);
        Map<Long, ApiUsageBucket> found = requests
                .series(shape.unit() == ChronoUnit.HOURS ? "hour" : "day", organizationId, clientId, since).stream()
                .collect(Collectors.toMap(ApiUsageBucket::getBucket, Function.identity()));
        List<ApiUsageDto.ApiUsagePoint> series = new ArrayList<>();
        for (int i = 0; i < shape.buckets(); i++) {
            Instant start = first.plus(step.multipliedBy(i));
            ApiUsageBucket bucket = found.get(start.getEpochSecond());
            series.add(bucket == null
                    ? new ApiUsageDto.ApiUsagePoint(start.atOffset(ZoneOffset.UTC), 0, 0, 0)
                    : new ApiUsageDto.ApiUsagePoint(start.atOffset(ZoneOffset.UTC), bucket.getSucceeded(),
                            bucket.getRejected(), bucket.getFailed()));
        }
        List<ApiRequestDto> failures = requests.findCatalog(organizationId, clientId, "errors", "",
                PageRequest.of(0, TOP_FAILURES)).map(ApiRequestDto::from).getContent();
        return new ApiUsageDto(period == null ? "day" : period, since, totals.getCalls(), totals.getRejected(),
                totals.getFailed(), totals.getBusy(), totals.getP95(), totals.getClients(), totals.getOrganizations(),
                series, clientId == null ? topClients(organizationId, since) : List.of(), failures,
                organization == null ? null : month(organization, now), settings.retentionDays());
    }

    private List<ApiUsageDto.ApiClientCalls> topClients(Long organizationId, OffsetDateTime since) {
        var top = requests.topClients(organizationId, null, since);
        Map<Long, String> names = organizationId != null ? Map.of()
                : organizations.findAllById(top.stream().map(row -> row.getOrganizationId()).distinct().toList())
                        .stream().collect(Collectors.toMap(Organization::getId, Organization::getName));
        return top.stream().map(row -> new ApiUsageDto.ApiClientCalls(row.getClientId(), row.getClientName(),
                row.getOrganizationId(), names.get(row.getOrganizationId()), row.getCalls(), row.getErrors()))
                .toList();
    }

    ApiUsageDto.ApiUsageMonth month(Organization organization, Instant now) {
        OffsetDateTime start = ApiCallLimits.monthStart(now);
        return new ApiUsageDto.ApiUsageMonth(
                requests.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organization.getId(), 200, start),
                settings.monthlyLimit(organization.getApiMonthlyCallLimit()), start.plusMonths(1));
    }
}
