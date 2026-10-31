package dev.ulloasp.mlsuite.audit.application.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.security.identity.RequestOrigin;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;

/**
 * Writes the audit log. The service that owns an action records it inside its own transaction, so
 * an entry stands exactly when the action does; work with no transaction writes the entry alone.
 * Either way a call is one INSERT and nothing else: the names an entry keeps are read by that
 * statement, and the address and request id come from the request being served, which is why
 * prediction runs can afford it. Background work has no request and records neither.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_LABEL = 255;
    private static final int MAX_TARGET_ID = 120;
    private static final String DELETED_ACCOUNT = "Deleted account";
    private static final ObjectMapper JSON = new ObjectMapper();

    private final JdbcTemplate jdbc;

    public void record(AuditActor actor, @Nullable Long organizationId, AuditAction action, @Nullable Object targetId) {
        record(actor, organizationId, action, targetId, Map.of());
    }

    /**
     * {@code organizationId} is null on a platform event; {@code details} come from
     * {@link AuditDetails}. The names kept are read when this runs, so record before deleting the
     * organization or account an entry names.
     */
    public void record(AuditActor actor, @Nullable Long organizationId, AuditAction action, @Nullable Object targetId,
            Map<String, Object> details) {
        RequestOrigin origin = RequestOrigin.current();
        jdbc.update("""
                INSERT INTO audit_event (actor_kind, actor_user_id, actor_label, organization_id, organization_label,
                    action, target_type, target_id, metadata, ip, request_id, created_at)
                VALUES (?, CAST(? AS bigint),
                    COALESCE(CAST(? AS varchar), (SELECT full_name FROM app_user WHERE id = CAST(? AS bigint)), ?),
                    CAST(? AS bigint), (SELECT name FROM organization WHERE id = CAST(? AS bigint)),
                    ?, ?, ?, CAST(? AS jsonb), ?, CAST(? AS uuid), now())""",
                actor.kind().name(), actor.userId(), bounded(actor.label(), MAX_LABEL), actor.userId(), DELETED_ACCOUNT,
                organizationId, organizationId, action.name(), action.targetType().name(),
                targetId == null ? null : bounded(targetId.toString(), MAX_TARGET_ID), json(details), origin.ip(),
                uuid(origin.requestId()));
    }

    private static String uuid(UUID value) {
        return value == null ? null : value.toString();
    }

    private static String bounded(String text, int limit) {
        return text == null || text.length() <= limit ? text : text.substring(0, limit);
    }

    private static String json(Map<String, Object> details) {
        if (details.isEmpty()) return null;
        try {
            return JSON.writeValueAsString(details);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Audit details are not serializable as JSON", ex);
        }
    }
}
