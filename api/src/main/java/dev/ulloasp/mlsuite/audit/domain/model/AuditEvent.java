package dev.ulloasp.mlsuite.audit.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One line of the audit log, read-only here: AuditLogService alone writes entries, in plain SQL.
 * It keeps ids without foreign keys and the names they had, so an entry outlives what it names.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_kind", nullable = false, length = 20)
    private AuditActorKind actorKind;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_label", nullable = false)
    private String actorLabel;

    /** Null on a platform event, which belongs to no organization. */
    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "organization_label")
    private String organizationLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 120)
    private AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 80)
    private AuditTargetType targetType;

    @Column(name = "target_id", length = 120)
    private String targetId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "ip", length = 64)
    private String ip;

    @Column(name = "request_id")
    private UUID requestId;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
