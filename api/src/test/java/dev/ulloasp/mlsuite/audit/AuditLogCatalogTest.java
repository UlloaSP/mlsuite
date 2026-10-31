package dev.ulloasp.mlsuite.audit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** An organization's audit log as recorded, paged over PostgreSQL behind the real security chain. */
class AuditLogCatalogTest extends PublicPredictionFixture {

    /** Role ids no bookmark of the fixture reaches, so a search by target id matches only them. */
    private static final int TARGET = 7_000_000;
    private static final OffsetDateTime START = OffsetDateTime.of(2020, 1, 1, 9, 0, 0, 0, ZoneOffset.UTC);
    private static final String PLATFORM = "/api/admin/audit-events/catalog";

    @Autowired AuditLogService auditLog;
    @Autowired JdbcTemplate jdbc;
    private RoleDefinition ownerRole;
    private User moderator;
    private User viewer;
    private Organization other;
    private String path;

    /**
     * Thirty role changes by the owner, a minute apart in 2020; a superadmin's unpublishing of the
     * organization's bookmark, recorded now; and an event of another organization that must never
     * show. The viewer is a member who may only see models.
     */
    @BeforeEach
    void recordEvents() {
        ownerRole = authorizeOwner();
        path = "/api/organizations/" + organization.getId() + "/audit-events/catalog";
        inTransaction(() -> {
            User actor = entityManager.find(User.class, owner.getId());
            Organization current = entityManager.find(Organization.class, organization.getId());
            String unique = String.valueOf(current.getId());
            moderator = new User("root-" + unique, "root-" + unique + "@example.test", "unused",
                    "Platform Root", SystemRole.SUPERADMIN);
            entityManager.persist(moderator);
            viewer = new User("viewer-" + unique, "viewer-" + unique + "@example.test", "unused",
                    "Viewer", SystemRole.USER);
            entityManager.persist(viewer);
            // Not a seeded slug: organizations outlive the test and are seeded again on later startups.
            RoleDefinition viewing = new RoleDefinition(current, RoleScope.ORGANIZATION, "Model reader",
                    "model-reader", null);
            viewing.setPermissions(EnumSet.of(PermissionKey.VIEW_WORKSPACE, PermissionKey.VIEW_MODELS));
            entityManager.persist(viewing);
            entityManager.persist(new OrganizationMembership(current, viewer, viewing, MembershipStatus.ACTIVE));
            for (int i = 0; i < 30; i++) {
                auditLog.record(AuditActor.user(actor.getId()), current.getId(),
                        i % 3 == 0 ? AuditAction.ROLE_DELETE : AuditAction.ROLE_UPDATE, TARGET + i,
                        AuditDetails.of("name", "Analyst %02d".formatted(i)));
            }
            auditLog.record(AuditActor.user(moderator.getId()), current.getId(),
                    AuditAction.BOOKMARK_MODERATION_UNPUBLISH, bookmark.getId(), AuditDetails.of("bookmark", "production"));
            other = new Organization("other-" + unique, "Other", null, actor);
            entityManager.persist(other);
            auditLog.record(AuditActor.user(actor.getId()), other.getId(), AuditAction.ROLE_DELETE, TARGET + 5,
                    AuditDetails.of("name", "Analyst 05"));
            entityManager.flush();
            entityManager.createNativeQuery("""
                    UPDATE audit_event
                    SET created_at = CAST(:start AS TIMESTAMPTZ)
                            + make_interval(mins => CAST(target_id AS INT) - :target)
                    WHERE organization_id = :organizationId AND target_type = 'ROLE'
                    """)
                    .setParameter("start", START)
                    .setParameter("target", TARGET)
                    .setParameter("organizationId", current.getId())
                    .executeUpdate();
        });
    }

    @Test
    void theLogIsPagedNewestFirstAndKeepsEachEntryAsRecorded() throws Exception {
        mockMvc.perform(asOwner(get(path).param("size", "24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(31))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].action").value("BOOKMARK_MODERATION_UNPUBLISH"))
                .andExpect(jsonPath("$.items[0].actor.kind").value("USER"))
                .andExpect(jsonPath("$.items[0].actor.id").value(moderator.getId()))
                .andExpect(jsonPath("$.items[0].actor.name").value("Platform Root"))
                .andExpect(jsonPath("$.items[0].targetType").value("SCHEMA_BOOKMARK"))
                .andExpect(jsonPath("$.items[0].targetId").value(bookmark.getId().toString()))
                .andExpect(jsonPath("$.items[0].metadata.bookmark").value("production"))
                .andExpect(jsonPath("$.items[0].organizationName").value("Acme Health"))
                .andExpect(jsonPath("$.items[1].targetId").value(String.valueOf(TARGET + 29)))
                .andExpect(jsonPath("$.items[1].action").value("ROLE_UPDATE"))
                .andExpect(jsonPath("$.items[1].actor.name").value("Owner"))
                .andExpect(jsonPath("$.items[23].targetId").value(String.valueOf(TARGET + 7)));
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "1")))
                .andExpect(jsonPath("$.items.length()").value(7))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items[0].targetId").value(String.valueOf(TARGET + 6)))
                .andExpect(jsonPath("$.items[6].targetId").value(String.valueOf(TARGET)));
    }

    @Test
    void entriesFilterByActionAndSearchByActorTargetOrMetadata() throws Exception {
        mockMvc.perform(asOwner(get(path).param("filter", "role_delete")))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("filter", "NOT_AN_ACTION")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(asOwner(get(path).param("search", "platform root")))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(path).param("search", "ANALYST 0")))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("search", "analyst 0").param("filter", "ROLE_DELETE")))
                .andExpect(jsonPath("$.totalItems").value(4));
        mockMvc.perform(asOwner(get(path).param("search", String.valueOf(TARGET + 12))))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].metadata.name").value("Analyst 12"));
        mockMvc.perform(asOwner(get(path).param("search", "%")))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void entriesFilterByPeriodActorAndTarget() throws Exception {
        mockMvc.perform(asOwner(get(path).param("from", START.toString()).param("to", START.plusMinutes(10).toString())))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("from", START.plusMinutes(29).toString())))
                .andExpect(jsonPath("$.totalItems").value(2));
        mockMvc.perform(asOwner(get(path).param("to", "not-a-date"))).andExpect(status().isBadRequest());
        mockMvc.perform(asOwner(get(path).param("targetType", "SCHEMA_BOOKMARK")))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(path).param("targetType", "NOT_A_TARGET"))).andExpect(status().isBadRequest());
        mockMvc.perform(asOwner(get(path).param("actor", "ROOT")))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(path).param("actorKind", "USER")))
                .andExpect(jsonPath("$.totalItems").value(31));
        mockMvc.perform(asOwner(get(path).param("actorKind", "SYSTEM")))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void aVisitorsAddressStaysWithThePlatform() throws Exception {
        String marker = "visitor-" + organization.getId();
        jdbc.update("""
                INSERT INTO audit_event (actor_kind, actor_label, organization_id, action, target_type, target_id, ip,
                    created_at) VALUES ('VISITOR', 'Public visitor', ?, 'PREDICTION_RUN', 'SCHEMA_BOOKMARK', ?,
                    '203.0.113.9', now())""", organization.getId(), marker);

        mockMvc.perform(asOwner(get(path).param("search", marker)))
                .andExpect(jsonPath("$.items[0].actor.kind").value("VISITOR"))
                .andExpect(jsonPath("$.items[0].ip").doesNotExist());
        mockMvc.perform(asRoot(get(PLATFORM).param("search", marker)))
                .andExpect(jsonPath("$.items[0].ip").value("203.0.113.9"));
    }

    @Test
    void thePlatformCatalogSpansEveryOrganizationAndItsOwnEvents() throws Exception {
        auditLog.record(AuditActor.SYSTEM, null, AuditAction.API_REQUEST_RETENTION_PRUNE, null,
                AuditDetails.of("removed", 3));
        String own = organization.getId().toString();

        mockMvc.perform(asRoot(get(PLATFORM).param("organization", own)))
                .andExpect(jsonPath("$.totalItems").value(31));
        mockMvc.perform(asRoot(get(PLATFORM).param("organization", other.getId().toString())))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].organizationName").value("Other"));
        mockMvc.perform(asRoot(get(PLATFORM).param("organization", "platform").param("actorKind", "SYSTEM")
                .param("filter", "API_REQUEST_RETENTION_PRUNE")))
                .andExpect(jsonPath("$.items[0].actor.name").value("System"))
                .andExpect(jsonPath("$.items[0].organizationId").doesNotExist());
        mockMvc.perform(asRoot(get(PLATFORM).param("search", "Other").param("filter", "ROLE_DELETE")))
                .andExpect(jsonPath("$.items[0].organizationName").value("Other"));
        mockMvc.perform(asRoot(get(PLATFORM).param("organization", "nonsense"))).andExpect(status().isBadRequest());
    }

    @Test
    void onlyPlatformAdministratorsReadThePlatformCatalog() throws Exception {
        mockMvc.perform(get(PLATFORM)).andExpect(status().isUnauthorized());
        mockMvc.perform(asOwner(get(PLATFORM))).andExpect(status().isForbidden());
    }

    @Test
    void onlyMembersWhoseRoleGrantsTheAuditLogReadIt() throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        mockMvc.perform(signedIn(get(path), viewer.getId())).andExpect(status().isForbidden());
        mockMvc.perform(asOwner(get("/api/workspace/context")))
                .andExpect(jsonPath("$.permissions.canViewAuditLog").value(true));

        // Losing the permission closes the log and takes it out of the member's permissions.
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.complementOf(EnumSet.of(PermissionKey.VIEW_AUDIT_LOG))));
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
        mockMvc.perform(asOwner(get("/api/workspace/context")))
                .andExpect(jsonPath("$.permissions.canViewAuditLog").value(false));

        // A superadmin reads any organization's log without being a member of it.
        mockMvc.perform(signedIn(get(path), moderator.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(31));
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }

    private MockHttpServletRequestBuilder asRoot(MockHttpServletRequestBuilder request) {
        return signedIn(request, moderator.getId(), SystemRole.SUPERADMIN);
    }
}
