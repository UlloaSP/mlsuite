package dev.ulloasp.mlsuite.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.context.request.RequestContextHolder;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.application.service.AuditRetention;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * What the log keeps of each entry over PostgreSQL: the names it was written with past the deletion
 * of what they name, where the request came from, sign-ins and their failures, and how long it
 * keeps it all.
 */
class AuditRecordingTest extends PublicPredictionFixture {

    /** A network of its own per test, so one test's failures never spend another's. */
    private static final AtomicInteger NETWORKS = new AtomicInteger(1);

    @Autowired AuditLogService auditLog;
    @Autowired AuditRetention retention;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Value("${mlsuite.auth.max-login-failures}") int maxLoginFailures;

    private final String network = "203.0.113." + NETWORKS.getAndIncrement();
    private String email;

    @BeforeEach
    void anAccountThatCanSignIn() {
        email = "audited-" + UUID.randomUUID() + "@example.test";
        inTransaction(() -> entityManager.persist(new User("u" + UUID.randomUUID().toString().substring(0, 20), email,
                passwords.encode("right-password"), "Audited Person", SystemRole.USER)));
    }

    @Test
    void anEntryKeepsItsNamesAndOutlivesWhatTheyName() {
        User gone = new User("gone" + System.nanoTime(), "gone" + System.nanoTime() + "@example.test", "unused",
                "Gone Person", SystemRole.USER);
        inTransaction(() -> entityManager.persist(gone));
        long orgId = jdbc.queryForObject("""
                INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                VALUES (?, 'Gone Inc', ?, now(), now()) RETURNING id""", Long.class,
                "gone-" + System.nanoTime(), gone.getId());

        auditLog.record(AuditActor.user(gone.getId()), orgId, AuditAction.ORGANIZATION_UPDATE, orgId,
                AuditDetails.of("name", AuditDetails.changed("Old", "Gone Inc")));
        jdbc.update("DELETE FROM organization WHERE id = ?", orgId);
        jdbc.update("DELETE FROM app_user WHERE id = ?", gone.getId());

        Map<String, Object> row = lastRow(AuditAction.ORGANIZATION_UPDATE);
        assertEquals("USER", row.get("actor_kind"));
        assertEquals("Gone Person", row.get("actor_label"));
        assertEquals(gone.getId(), row.get("actor_user_id"));
        assertEquals("Gone Inc", row.get("organization_label"));
        assertEquals(orgId, row.get("organization_id"));
        assertEquals("ORGANIZATION", row.get("target_type"));
        assertEquals(String.valueOf(orgId), row.get("target_id"));
        assertTrue(row.get("metadata").toString().contains("\"from\": \"Old\""));
    }

    @Test
    void anActorIsNeverBlankAndWorkOutsideARequestNeedsNoOrganizationOrOrigin() {
        RequestContextHolder.resetRequestAttributes();
        auditLog.record(AuditActor.user(-1L), null, AuditAction.AUTH_LOGOUT, -1L);
        assertEquals("Deleted account", lastRow(AuditAction.AUTH_LOGOUT).get("actor_label"));

        auditLog.record(AuditActor.SYSTEM, null, AuditAction.AUDIT_RETENTION_PRUNE, null);
        Map<String, Object> row = lastRow(AuditAction.AUDIT_RETENTION_PRUNE);
        assertEquals("System", row.get("actor_label"));
        assertEquals("SYSTEM", row.get("actor_kind"));
        assertNull(row.get("organization_id"));
        assertNull(row.get("organization_label"));
        assertNull(row.get("ip"));
        assertNull(row.get("request_id"));
        assertNull(row.get("metadata"));
    }

    @Test
    void anEntryFallsWithTheTransactionItWasRecordedIn() {
        long before = entries(AuditAction.MODEL_RENAME);

        assertThrows(IllegalStateException.class, () -> inTransaction(() -> {
            auditLog.record(AuditActor.user(owner.getId()), organization.getId(), AuditAction.MODEL_RENAME, 1L);
            throw new IllegalStateException("the action failed");
        }));

        assertEquals(before, entries(AuditAction.MODEL_RENAME));
    }

    @Test
    void aSignInIsAPlatformEventFromTheCallersAddress() throws Exception {
        mockMvc.perform(login("right-password")).andExpect(status().isOk());

        Map<String, Object> row = lastRow(AuditAction.AUTH_LOGIN);
        assertEquals("Audited Person", row.get("actor_label"));
        assertEquals(network, row.get("ip"));
        assertNotNull(row.get("request_id"));
        assertNull(row.get("organization_id"));
    }

    @Test
    void aFailedSignInNamesTheEmailTriedAndAFloodIsBounded() throws Exception {
        long before = entries(AuditAction.AUTH_LOGIN_FAILED);
        for (int attempt = 0; attempt < maxLoginFailures + 5; attempt++) {
            mockMvc.perform(login("wrong-password"));
        }

        assertEquals(before + maxLoginFailures, entries(AuditAction.AUTH_LOGIN_FAILED));
        Map<String, Object> row = lastRow(AuditAction.AUTH_LOGIN_FAILED);
        assertEquals(email, row.get("actor_label"));
        assertEquals("VISITOR", row.get("actor_kind"));
        assertNull(row.get("actor_user_id"));
        assertEquals(network, row.get("ip"));
        assertFalse(String.valueOf(row.get("metadata")).contains("wrong-password"));
    }

    @Test
    void signingOutIsRecordedAndAnAnonymousLogoutIsNot() throws Exception {
        long before = entries(AuditAction.AUTH_LOGOUT);

        mockMvc.perform(post("/api/logout")).andExpect(status().isNoContent());
        assertEquals(before, entries(AuditAction.AUTH_LOGOUT));

        mockMvc.perform(signedIn(post("/api/logout"), owner.getId()).header(ClientNetworks.CLIENT_ADDRESS_HEADER, network))
                .andExpect(status().isNoContent());
        Map<String, Object> row = lastRow(AuditAction.AUTH_LOGOUT);
        assertEquals(owner.getId(), row.get("actor_user_id"));
        assertEquals("Owner", row.get("actor_label"));
        assertEquals(network, row.get("ip"));
    }

    @Test
    void registeringIsRecordedOnceWithoutTheAutomaticSignIn() throws Exception {
        String address = "register-" + UUID.randomUUID() + "@example.test";
        long logins = entries(AuditAction.AUTH_LOGIN);
        long organizations = entries(AuditAction.ORGANIZATION_CREATE);

        mockMvc.perform(post("/api/auth/register").header(ClientNetworks.CLIENT_ADDRESS_HEADER, network)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "email", address, "password", "a-long-password", "fullName", "New Person",
                        "username", "new-" + UUID.randomUUID().toString().substring(0, 8)))))
                .andExpect(status().isCreated());

        Map<String, Object> row = lastRow(AuditAction.AUTH_REGISTER);
        assertEquals("New Person", row.get("actor_label"));
        assertTrue(row.get("metadata").toString().contains(address));
        assertEquals(logins, entries(AuditAction.AUTH_LOGIN));
        // Opening a personal account is part of the registration, and no organization was created.
        assertEquals(organizations, entries(AuditAction.ORGANIZATION_CREATE));
    }

    @Test
    void theRetentionPruneRemovesOnlyWhatIsPastTheWindowAndSaysSoOnce() {
        List<Long> old = insertAged("8 days", 5_003);
        List<Long> kept = insertAged("6 days", 2);
        long reports = entries(AuditAction.AUDIT_RETENTION_PRUNE);

        retention.prune();

        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE id = ANY(?)", Integer.class,
                (Object) old.toArray(Long[]::new)));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE id = ANY(?)", Integer.class,
                (Object) kept.toArray(Long[]::new)));
        assertEquals(reports + 1, entries(AuditAction.AUDIT_RETENTION_PRUNE));
        Map<String, Object> row = lastRow(AuditAction.AUDIT_RETENTION_PRUNE);
        assertEquals("SYSTEM", row.get("actor_kind"));
        assertTrue(row.get("metadata").toString().contains("\"retentionDays\": 7"));

        retention.prune();
        assertEquals(reports + 1, entries(AuditAction.AUDIT_RETENTION_PRUNE));
    }

    @Test
    void retentionShorterThanADayIsRefused() {
        assertThrows(IllegalArgumentException.class, () -> new AuditRetention(jdbc, auditLog, 0));
    }

    private List<Long> insertAged(String age, int rows) {
        return jdbc.queryForList("""
                INSERT INTO audit_event (actor_kind, actor_label, action, target_type, created_at)
                SELECT 'SYSTEM', 'System', 'PLUGIN_DELETE', 'PLUGIN', now() - CAST(? AS interval)
                FROM generate_series(1, ?) RETURNING id""", Long.class, age, rows);
    }

    private MockHttpServletRequestBuilder login(String password) throws Exception {
        return post("/api/auth/login").header(ClientNetworks.CLIENT_ADDRESS_HEADER, network)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password)));
    }

    private long entries(AuditAction action) {
        return jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = ?", Long.class, action.name());
    }

    private Map<String, Object> lastRow(AuditAction action) {
        return jdbc.queryForMap("SELECT * FROM audit_event WHERE action = ? ORDER BY id DESC LIMIT 1", action.name());
    }
}
