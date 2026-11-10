package dev.ulloasp.mlsuite.audit.application.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActorKind;
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
    private static final ObjectMapper JSON = JsonMapper.shared();

    /** The principal that acted: a person's or a client's, or the platform's; a visitor is none. */
    private static final String ACTOR = """
            CASE CAST(? AS varchar)
                WHEN 'USER' THEN (SELECT id FROM principal WHERE user_id = CAST(? AS bigint))
                WHEN 'API_CLIENT' THEN (SELECT id FROM principal WHERE api_client_id = CAST(? AS bigint))
                WHEN 'SYSTEM' THEN (SELECT id FROM principal WHERE kind = 'SYSTEM')
            END""";

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
        Long userId = actor.kind() == AuditActorKind.USER ? actor.id() : null;
        jdbc.update("""
                INSERT INTO audit_event (actor_kind, actor_principal_id, actor_label, organization_id, organization_label,
                    action, target_type, target_id, metadata, ip, request_id, created_at)
                VALUES (?, %s,
                    COALESCE(CAST(? AS varchar), (SELECT full_name FROM app_user WHERE id = CAST(? AS bigint)), ?),
                    CAST(? AS bigint), (SELECT name FROM organization WHERE id = CAST(? AS bigint)),
                    ?, ?, ?, CAST(? AS jsonb), CAST(? AS inet), CAST(? AS uuid), now())""".formatted(ACTOR),
                actor.kind().name(), actor.kind().name(), actor.id(), actor.id(), bounded(actor.label(), MAX_LABEL),
                userId, DELETED_ACCOUNT,
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
        } catch (JacksonException ex) {
            throw new IllegalArgumentException("Audit details are not serializable as JSON", ex);
        }
    }
}
