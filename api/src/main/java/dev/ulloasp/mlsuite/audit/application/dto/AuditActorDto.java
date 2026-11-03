package dev.ulloasp.mlsuite.audit.application.dto;

import dev.ulloasp.mlsuite.audit.domain.model.AuditActorKind;
import dev.ulloasp.mlsuite.audit.domain.model.AuditEvent;
import jakarta.annotation.Nullable;

/** Who acted, by the name the entry kept: a person, the system, an API client or a visitor. */
public record AuditActorDto(AuditActorKind kind, @Nullable Long id, String name) {

    public static AuditActorDto from(AuditEvent event) {
        return new AuditActorDto(event.getActorKind(), event.getActorUserId(), event.getActorLabel());
    }
}
