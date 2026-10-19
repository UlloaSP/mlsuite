package dev.ulloasp.mlsuite.audit.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import jakarta.annotation.Nullable;

/** One audit log entry as it was recorded. */
public record AuditEventDto(
        Long id,
        OffsetDateTime createdAt,
        AuditActorDto actor,
        String action,
        String targetType,
        @Nullable String targetId,
        @Nullable String metadata) {

    public static AuditEventDto from(AuditEvent event) {
        return new AuditEventDto(
                event.getId(),
                event.getCreatedAt(),
                AuditActorDto.from(event.getActor()),
                event.getAction(),
                event.getTargetType(),
                event.getTargetId(),
                event.getMetadata());
    }
}
