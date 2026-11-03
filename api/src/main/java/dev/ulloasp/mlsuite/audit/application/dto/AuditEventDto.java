package dev.ulloasp.mlsuite.audit.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActorKind;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType;
import jakarta.annotation.Nullable;

/** One audit log entry as it was recorded. */
public record AuditEventDto(
        Long id,
        OffsetDateTime createdAt,
        AuditActorDto actor,
        AuditAction action,
        AuditTargetType targetType,
        @Nullable String targetId,
        @Nullable Map<String, Object> metadata,
        @Nullable Long organizationId,
        @Nullable String organizationName,
        @Nullable String ip,
        @Nullable UUID requestId) {

    /** As the platform's administrators read it, addresses included. */
    public static AuditEventDto from(AuditEvent event) {
        return of(event, event.getIp());
    }

    /**
     * As an organization reads its own log: a visitor is a stranger to it, so their address stays
     * with the platform, while its members' and clients' addresses are the organization's to see.
     */
    public static AuditEventDto forOrganization(AuditEvent event) {
        return of(event, event.getActorKind() == AuditActorKind.VISITOR ? null : event.getIp());
    }

    private static AuditEventDto of(AuditEvent event, String ip) {
        return new AuditEventDto(event.getId(), event.getCreatedAt(), AuditActorDto.from(event), event.getAction(),
                event.getTargetType(), event.getTargetId(), event.getMetadata(), event.getOrganizationId(),
                event.getOrganizationLabel(), ip, event.getRequestId());
    }
}
