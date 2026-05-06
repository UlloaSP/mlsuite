package dev.ulloasp.mlsuite.audit.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;

public record AuditEventDto(
        Long id,
        String actorName,
        String actorEmail,
        String action,
        String targetType,
        String targetId,
        String metadata,
        OffsetDateTime createdAt) {

    public static AuditEventDto from(AuditEvent event) {
        return new AuditEventDto(
                event.getId(),
                event.getActor().getFullName(),
                event.getActor().getEmail(),
                event.getAction(),
                event.getTargetType(),
                event.getTargetId(),
                event.getMetadata(),
                event.getCreatedAt());
    }
}
