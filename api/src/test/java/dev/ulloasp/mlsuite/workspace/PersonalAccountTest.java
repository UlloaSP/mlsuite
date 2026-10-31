package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.admin.AdminCreateUserRequest;
import dev.ulloasp.mlsuite.admin.AdminUpdateUserRequest;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Personal accounts and a user's way back to their own account, on the whole application. */
class PersonalAccountTest extends PersonalAccountFixture {

    @Autowired AuditLogService auditLog;

    private void joined(User user, long organizationId) {
        inTransaction(() -> {
            var team = entityManager.find(Organization.class, organizationId);
            var viewer = roles.findByOrganizationIdAndSystemKey(organizationId, "VIEWER").orElseThrow();
            entityManager.persist(new OrganizationMembership(team, user, viewer, MembershipStatus.ACTIVE));
        });
    }

    private User superadmin() throws Exception {
        User user = registered(unique("root"));
        inTransaction(() -> entityManager.find(User.class, user.getId()).setSystemRole(SystemRole.SUPERADMIN));
        return user;
    }

    @Test
    void signingUpOpensAPersonalAccountAndNoOrganization() throws Exception {
        String handle = unique("ada");
        User user = registered(handle);

        mockMvc.perform(as(user, get(CURRENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.kind").value("PERSONAL"))
                .andExpect(jsonPath("$.currentOrganization.slug").value(handle))
                .andExpect(jsonPath("$.currentOrganization.name").value("Ada Lovelace"))
                .andExpect(jsonPath("$.currentOrganization.description").isEmpty())
                .andExpect(jsonPath("$.currentMembership.roleDefinition.systemKey").value("OWNER"))
                .andExpect(jsonPath("$.permissions.canCreateModels").value(true))
                .andExpect(jsonPath("$.membershipCount").value(0));
        mockMvc.perform(as(user, get(SWITCHABLE).param("filter", "team")))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(as(user, get(SWITCHABLE)))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].kind").value("PERSONAL"));
    }

    @Test
    void adminCreatedUsersOpenTheirAccountAndARenameCarriesItsSlugAndName() {
        String handle = unique("grace");
        var created = adminUsers.create(owner.getId(), new AdminCreateUserRequest(unique("grace") + "@example.test", PASSWORD,
                "Grace Hopper", handle, "USER", true));
        Organization personal = organizations.findByOwnerUserId(created.id()).orElseThrow();
        assertEquals(handle, personal.getSlug());

        String renamed = unique("rear-admiral");
        adminUsers.update(owner.getId(), created.id(), new AdminUpdateUserRequest("Grace B. Hopper", renamed, null, null));

        Organization after = organizations.findById(personal.getId()).orElseThrow();
        assertEquals(renamed, after.getSlug());
        assertEquals("Grace B. Hopper", after.getName());
        assertEquals(renamed, users.findById(created.id()).orElseThrow().getUsername());
    }

    /** Reads must leave accounts as they found them: the self-healing bootstrap is gone. */
    @Test
    void readingACurrentContextCreatesNothing() throws Exception {
        User user = registered(unique("reader"));
        long before = count("Organization");

        mockMvc.perform(as(user, get(CURRENT))).andExpect(status().isOk());
        mockMvc.perform(as(user, get("/api/users/me"))).andExpect(status().isOk());

        assertEquals(before, count("Organization"));
    }

    @Test
    void aPersonalAccountRefusesWhatOnlyAnOrganizationDoes() throws Exception {
        User user = registered(unique("solo"));
        for (User actor : List.of(user, superadmin())) {
            for (MockHttpServletRequestBuilder request : refusedOnPersonal(personalOf(user), user)) {
                var asActor = actor.equals(user) ? as(actor, request) : asSuperadmin(actor, request);
                mockMvc.perform(asActor.contentType(MediaType.APPLICATION_JSON))
                        .andExpect(status().isConflict())
                        .andExpect(jsonPath("$.message", containsString("personal account")));
            }
        }
    }

    @Test
    void aPersonalAccountHasNoLogoToReplaceOrRemove() throws Exception {
        User user = registered(unique("logo"));
        String logo = ORGANIZATIONS + "/" + personalOf(user).getId() + "/logo";
        MockMultipartHttpServletRequestBuilder replace = multipart(HttpMethod.PUT, logo)
                .file(new MockMultipartFile("logo", "logo.png", "image/png", new byte[] { 1 }));

        mockMvc.perform(signedIn(replace, user.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("personal account")));
        mockMvc.perform(as(user, delete(logo)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("personal account")));
    }

    /** Opening an account is the user's creation, not an organization anybody created. */
    @Test
    void signingUpAuditsTheAccountAndNoOrganization() throws Exception {
        long before = auditRows("action = 'ORGANIZATION_CREATE'");
        String handle = unique("audited");
        User user = registered(handle);

        assertEquals(1, auditRows("action = 'AUTH_REGISTER' AND organization_id IS NULL AND target_id = '"
                + user.getId() + "' AND metadata ->> 'username' = '" + handle + "'"));
        assertEquals(before, auditRows("action = 'ORGANIZATION_CREATE'"));
        assertEquals(0, auditRows("organization_id = " + personalOf(user).getId()));

        long team = createdOrganization(user, "Team", unique("team"));

        assertEquals(1, auditRows("action = 'ORGANIZATION_CREATE' AND organization_id = " + team));
    }

    @Test
    void theOwnerReadsWhatHappenedInTheirAccount() throws Exception {
        User user = registered(unique("working"));
        Organization personal = personalOf(user);
        auditLog.record(AuditActor.user(user.getId()), personal.getId(), AuditAction.PLUGIN_UPLOAD, "plugin");

        mockMvc.perform(as(user, get(ORGANIZATIONS + "/" + personal.getId() + "/audit-events/catalog")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].action").value("PLUGIN_UPLOAD"))
                .andExpect(jsonPath("$.items[0].organizationName").value(personal.getName()))
                .andExpect(jsonPath("$.items[0].actor.name").value(user.getFullName()));
    }

    @Test
    void removingAMemberKeepsItsAuditEntry() throws Exception {
        User creator = registered(unique("creator"));
        User member = registered(unique("member"));
        long team = createdOrganization(creator, "Team", unique("team"));
        joined(member, team);
        long membership = memberships.findActiveByOrganizationIdAndUserId(team, member.getId()).orElseThrow().getId();

        mockMvc.perform(as(creator, delete(ORGANIZATIONS + "/" + team + "/members/" + membership)))
                .andExpect(status().isNoContent());

        assertEquals(1, auditRows("action = 'MEMBER_REMOVE' AND organization_id = " + team
                + " AND target_id = '" + membership + "'"));
    }

    private long auditRows(String condition) {
        Long rows = new JdbcTemplate(dataSource).queryForObject(
                "SELECT count(*) FROM audit_event WHERE " + condition, Long.class);
        return rows == null ? 0 : rows;
    }

    private List<MockHttpServletRequestBuilder> refusedOnPersonal(Organization personal, User user) {
        String base = ORGANIZATIONS + "/" + personal.getId();
        long membership = memberships.findActiveByOrganizationIdAndUserId(personal.getId(), user.getId())
                .orElseThrow().getId();
        long owner = roles.findByOrganizationIdAndSystemKey(personal.getId(), "OWNER").orElseThrow().getId();
        long viewer = roles.findByOrganizationIdAndSystemKey(personal.getId(), "VIEWER").orElseThrow().getId();
        String newRole = "{\"name\":\"Mine\",\"permissionKeys\":[\"VIEW_MODELS\"]}";
        List<MockHttpServletRequestBuilder> refused = new ArrayList<>();
        refused.add(patch(base).content("{\"name\":\"Renamed\"}"));
        refused.add(delete(base));
        refused.add(post(base + "/transfer-ownership").content("{\"nextOwnerMembershipId\":" + membership + "}"));
        refused.add(patch(base + "/members/" + membership).content("{\"roleDefinitionId\":" + viewer + "}"));
        refused.add(delete(base + "/members/" + membership));
        refused.add(post(base + "/invitations")
                .content("{\"email\":\"friend@example.test\",\"roleDefinitionId\":" + viewer + "}"));
        refused.add(get(base + "/invitation-candidates"));
        refused.add(get(base + "/invitation-candidates/catalog"));
        refused.add(post(base + "/roles").content(newRole));
        refused.add(patch(base + "/roles/" + viewer).content(newRole));
        refused.add(post(base + "/roles/" + viewer + "/duplicate").content("{\"name\":\"Copy\"}"));
        refused.add(delete(base + "/roles/" + owner));
        return refused;
    }

    @Test
    void permissionsKeepWorkingForTheOwnerInTheirAccount() throws Exception {
        User user = registered(unique("owner-checks"));
        String base = ORGANIZATIONS + "/" + personalOf(user).getId();

        mockMvc.perform(as(user, get(base))).andExpect(status().isOk());
        mockMvc.perform(as(user, get(base + "/admin-dashboard"))).andExpect(status().isOk());
        mockMvc.perform(as(registered(unique("stranger")), get(base))).andExpect(status().isForbidden());
    }

    @Test
    void aMemberRemovedFromTheirCurrentOrganizationLandsInTheirPersonalAccount() throws Exception {
        User creator = registered(unique("creator"));
        User member = registered(unique("member"));
        long team = createdOrganization(creator, "Team", unique("team"));
        joined(member, team);
        mockMvc.perform(as(member, patch(CURRENT)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"organizationId\":" + team + "}")).andExpect(status().isOk());
        mockMvc.perform(as(member, get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.id").value(team))
                .andExpect(jsonPath("$.membershipCount").value(1));
        long membership = memberships.findActiveByOrganizationIdAndUserId(team, member.getId()).orElseThrow().getId();

        mockMvc.perform(as(creator, delete(ORGANIZATIONS + "/" + team + "/members/" + membership)))
                .andExpect(status().isNoContent());

        mockMvc.perform(as(member, get(CURRENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.kind").value("PERSONAL"))
                .andExpect(jsonPath("$.currentOrganization.slug").value(member.getUsername()))
                .andExpect(jsonPath("$.membershipCount").value(0));
        assertNull(users.findById(member.getId()).orElseThrow().getCurrentOrganization());
    }

    @Test
    void aSelectionTheUserCanNoLongerActInFallsBackWithoutTouchingIt() throws Exception {
        User creator = registered(unique("creator"));
        User member = registered(unique("member"));
        long team = createdOrganization(creator, "Team", unique("team"));
        inTransaction(() -> entityManager.find(User.class, member.getId())
                .setCurrentOrganization(entityManager.find(Organization.class, team)));

        mockMvc.perform(as(member, get(CURRENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.kind").value("PERSONAL"));
    }

    @Test
    void deletingTheCurrentOrganizationLeavesItsOwnerInTheirPersonalAccount() throws Exception {
        User creator = registered(unique("creator"));
        long team = createdOrganization(creator, "Team", unique("team"));
        mockMvc.perform(as(creator, patch(CURRENT)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"organizationId\":" + team + "}")).andExpect(status().isOk());

        mockMvc.perform(as(creator, delete(ORGANIZATIONS + "/" + team))).andExpect(status().isNoContent());

        mockMvc.perform(as(creator, get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.kind").value("PERSONAL"));
    }

    @Test
    void creatingAnOrganizationLeavesTheCreatorWhereTheyAre() throws Exception {
        User creator = registered(unique("creator"));

        long team = createdOrganization(creator, "Team", unique("team"));

        mockMvc.perform(as(creator, get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.kind").value("PERSONAL"))
                .andExpect(jsonPath("$.membershipCount").value(1));
        mockMvc.perform(as(creator, get(SWITCHABLE)))
                .andExpect(jsonPath("$.items[0].kind").value("PERSONAL"))
                .andExpect(jsonPath("$.items[1].id").value(team));
        assertEquals(OrganizationKind.TEAM, organizations.findById(team).orElseThrow().getKind());
    }

    @Test
    void othersOrganizationsStayHiddenFromUsers() throws Exception {
        User creator = registered(unique("creator"));
        User stranger = registered(unique("stranger"));
        createdOrganization(creator, "Team", unique("team"));

        mockMvc.perform(as(stranger, get(SWITCHABLE).param("filter", "team")))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(as(stranger, get(ORGANIZATIONS + "/catalog"))).andExpect(status().isForbidden());
    }

    @Test
    void administrationListsTeamsAndOnlyTheirOwnPersonalAccount() throws Exception {
        User root = superadmin();
        User user = registered(unique("someone"));
        String slug = unique("team");
        long team = createdOrganization(user, "Team", slug);

        mockMvc.perform(asSuperadmin(root, get(ORGANIZATIONS + "/catalog").param("search", user.getUsername())))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(asSuperadmin(root, get(ORGANIZATIONS + "/catalog").param("search", slug)))
                .andExpect(jsonPath("$.items[0].id").value(team));
        mockMvc.perform(asSuperadmin(root, get(SWITCHABLE).param("search", user.getUsername())))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(asSuperadmin(root, get(SWITCHABLE).param("search", root.getUsername())))
                .andExpect(jsonPath("$.items[0].kind").value("PERSONAL"));
        mockMvc.perform(asSuperadmin(root, get(ORGANIZATIONS + "/" + personalOf(user).getId())))
                .andExpect(status().isOk());
    }
}
