package dev.ulloasp.mlsuite.util;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * An organization whose owner may read every catalog, a second member, one run, and a superadmin;
 * and the checks every catalog answers alike: its defaults are served, and an unknown value, a
 * negative page or a size out of range is refused with 400 and the parameter named.
 */
abstract class CatalogParameterFixture extends PublicPredictionFixture {

    protected User admin;
    protected RoleDefinition memberRole;
    protected OrganizationMembership member;
    protected long runId;

    @BeforeEach
    void anOrganizationWithAMemberARunAndASuperadmin() {
        authorizeOwner();
        long n = System.nanoTime();
        inTransaction(() -> {
            admin = new User("admin" + n, "admin" + n + "@example.test", "unused", "Admin", SystemRole.SUPERADMIN);
            entityManager.persist(admin);
            User person = new User("member" + n, "member" + n + "@example.test", "unused", "Member", SystemRole.USER);
            entityManager.persist(person);
            memberRole = new RoleDefinition(organization, "Member", "member", null, principals.system());
            entityManager.persist(memberRole);
            member = new OrganizationMembership(organization, person, memberRole, MembershipStatus.ACTIVE,
                    principals.of(owner));
            entityManager.persist(member);
        });
        run(bookmark.getPublicId(), request(Map.of("in0", 52)));
        runId = entityManager.createQuery("select max(r.id) from PredictionRun r", Long.class).getSingleResult();
    }

    /** The owner's request, a superadmin's, or a visitor's. */
    protected enum Caller { OWNER, ADMIN, VISITOR }

    protected MockHttpServletRequestBuilder as(Caller caller, MockHttpServletRequestBuilder request) {
        return switch (caller) {
            case OWNER -> signedIn(request, owner.getId());
            case ADMIN -> signedIn(request, admin.getId(), SystemRole.SUPERADMIN);
            case VISITOR -> request;
        };
    }

    /**
     * A catalog read by query parameters: served with its defaults, and refusing an unknown sort, an
     * unknown value of {@code filterParameter} (none when the catalog has no filter), page -1 and size 0.
     */
    protected void refusesUnknownValues(Caller caller, String path, String filterParameter) throws Exception {
        try {
            mockMvc.perform(as(caller, get(path))).andExpect(status().isOk());
            refused(as(caller, get(path).param("sort", "bogus")), "Unknown sort 'bogus'; expected ");
            if (filterParameter != null) {
                refused(as(caller, get(path).param(filterParameter, "bogus")),
                        "Unknown " + filterParameter + " 'bogus'; expected ");
            }
            refusesPaging(caller, path);
        } catch (AssertionError failure) {
            throw new AssertionError(path + ": " + failure.getMessage(), failure);
        }
    }

    private void refusesPaging(Caller caller, String path) throws Exception {
        refused(as(caller, get(path).param("page", "-1")), "Invalid page '-1'; expected 0 or more");
        refused(as(caller, get(path).param("size", "0")), "Invalid size '0'; expected 1 to 100");
        refused(as(caller, get(path).param("size", "101")), "Invalid size '101'; expected 1 to 100");
    }

    protected void refused(MockHttpServletRequestBuilder request, String message) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", startsWith(message)));
    }
}
