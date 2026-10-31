package dev.ulloasp.mlsuite.audit.application.dto;

import java.time.OffsetDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import dev.ulloasp.mlsuite.audit.domain.model.AuditActorKind;
import dev.ulloasp.mlsuite.audit.domain.model.AuditTargetType;
import jakarta.annotation.Nullable;

/**
 * What narrows an audit catalog beyond its search and action: a period ({@code to} excluded), the
 * kind of actor, part of the actor's name, and the kind of target.
 */
public record AuditFilters(
        @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
        @Nullable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
        @Nullable AuditActorKind actorKind,
        @Nullable String actor,
        @Nullable AuditTargetType targetType) {

    public static final AuditFilters NONE = new AuditFilters(null, null, null, null, null);
}
