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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
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

    @Autowired AuditLogService auditLog;
    private RoleDefinition ownerRole;
    private User moderator;
    private User viewer;
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
                auditLog.record(current, actor, i % 3 == 0 ? "ROLE_DELETE" : "ROLE_UPDATE", "ROLE",
                        String.valueOf(TARGET + i), "Analyst %02d".formatted(i));
            }
            auditLog.record(current, moderator, "BOOKMARK_MODERATION_UNPUBLISH", "SCHEMA_BOOKMARK",
                    bookmark.getId().toString(), "production");
            Organization other = new Organization("other-" + unique, "Other", null, actor);
            entityManager.persist(other);
            auditLog.record(other, actor, "ROLE_DELETE", "ROLE", String.valueOf(TARGET + 5), "Analyst 05");
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
                .andExpect(jsonPath("$.items[0].actor.id").value(moderator.getId()))
                .andExpect(jsonPath("$.items[0].actor.name").value("Platform Root"))
                .andExpect(jsonPath("$.items[0].targetType").value("SCHEMA_BOOKMARK"))
                .andExpect(jsonPath("$.items[0].targetId").value(bookmark.getId().toString()))
                .andExpect(jsonPath("$.items[0].metadata").value("production"))
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
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(asOwner(get(path).param("search", "platform root")))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(path).param("search", "ANALYST 0")))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("search", "analyst 0").param("filter", "ROLE_DELETE")))
                .andExpect(jsonPath("$.totalItems").value(4));
        mockMvc.perform(asOwner(get(path).param("search", String.valueOf(TARGET + 12))))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].metadata").value("Analyst 12"));
        mockMvc.perform(asOwner(get(path).param("search", "%")))
                .andExpect(jsonPath("$.totalItems").value(0));
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
}
