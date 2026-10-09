package dev.ulloasp.mlsuite.schema.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

class ReviewerSelectionCatalogTest extends PublicPredictionFixture {
    private final List<String> eligible = new ArrayList<>();
    private RoleDefinition ownerRole;

    @BeforeEach
    void manyMembersWithDifferentEligibility() {
        ownerRole = authorizeOwner();
        inTransaction(() -> {
            RoleDefinition reviewRole = new RoleDefinition(organization, RoleScope.ORGANIZATION, "Reviewer", "reviewer", null);
            reviewRole.setPermissions(EnumSet.of(PermissionKey.REVIEW));
            entityManager.persist(reviewRole);
            RoleDefinition withoutReview = new RoleDefinition(organization, RoleScope.ORGANIZATION, "Reader", "reader", null);
            withoutReview.setPermissions(EnumSet.of(PermissionKey.VIEW_MODELS));
            entityManager.persist(withoutReview);
            for (int i = 0; i < 30; i++) {
                User u = user("Person %02d".formatted(i), SystemRole.USER);
                join(organization, u, reviewRole, MembershipStatus.ACTIVE);
                eligible.add(u.getId().toString());
            }
            User admin = user("Superadmin", SystemRole.SUPERADMIN);
            join(organization, admin, withoutReview, MembershipStatus.ACTIVE);
            eligible.add(admin.getId().toString());
            User disabled = user("Disabled", SystemRole.USER);
            disabled.setEnabled(false);
            join(organization, disabled, reviewRole, MembershipStatus.ACTIVE);
            join(organization, user("Removed", SystemRole.USER), reviewRole, MembershipStatus.REMOVED);
            join(organization, user("No review", SystemRole.USER), withoutReview, MembershipStatus.ACTIVE);
            user("Nonmember superadmin", SystemRole.SUPERADMIN);
            Organization foreign = new Organization("foreign-reviewers-" + schema.getId(), "Foreign", null, owner);
            entityManager.persist(foreign);
            RoleDefinition foreignRole = new RoleDefinition(foreign, RoleScope.ORGANIZATION, "Reviewer", "reviewer", null);
            foreignRole.setPermissions(EnumSet.of(PermissionKey.REVIEW));
            entityManager.persist(foreignRole);
            join(foreign, user("Foreign", SystemRole.USER), foreignRole, MembershipStatus.ACTIVE);
        });
        eligible.addFirst(owner.getId().toString());
    }

    @Test
    void pagesAndSearchesOnlyEnabledActiveEligibleReviewersWithWholeResultSelection() throws Exception {
        mockMvc.perform(request("", 1, false)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAvailable").value(32)).andExpect(jsonPath("$.totalItems").value(32))
                .andExpect(jsonPath("$.items.length()").value(8)).andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(request("PERSON 29", 0, false)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAvailable").value(32)).andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(eligible.get(30)));
        var response = mockMvc.perform(request("", 0, true)).andExpect(status().isOk()).andReturn();
        var ids = objectMapper.readTree(response.getResponse().getContentAsString());
        assertEquals(eligible, objectMapper.convertValue(ids,
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)));
        mockMvc.perform(request("%", 0, false)).andExpect(jsonPath("$.totalItems").value(0));
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.of(PermissionKey.VIEW_MODELS)));
        mockMvc.perform(request("", 0, false)).andExpect(status().isForbidden());
        mockMvc.perform(request("", 0, true)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/catalog-selection").contentType(MediaType.APPLICATION_JSON)
                .content("{\"kind\":\"reviewers\"}")).andExpect(status().isUnauthorized());
    }

    private User user(String name, SystemRole systemRole) {
        String username = "reviewer-" + schema.getId() + "-" + name.replace(' ', '-');
        User u = new User(username, username + "@test.example", "unused", name, systemRole);
        entityManager.persist(u);
        return u;
    }

    private void join(Organization org, User u, RoleDefinition role, MembershipStatus status) {
        entityManager.persist(new OrganizationMembership(org, u, role, status));
    }

    private MockHttpServletRequestBuilder request(String search, int page, boolean ids) throws Exception {
        return signedIn(post("/api/catalog-selection" + (ids ? "/ids" : "")).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("kind", "reviewers", "search", search,
                        "page", page, "size", 24))), owner.getId());
    }
}
