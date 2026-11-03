package dev.ulloasp.mlsuite.workspace;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.admin.AdminUserService;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Accounts made the way people make them, through registration on the whole application. */
abstract class PersonalAccountFixture extends PublicPredictionFixture {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    static final String CURRENT = "/api/workspace/context/current";
    static final String SWITCHABLE = "/api/workspace/context/organizations/catalog";
    static final String ORGANIZATIONS = "/api/organizations";
    static final String PASSWORD = "correct-horse-battery";

    @Autowired AdminUserService adminUsers;
    @Autowired OrganizationRepository organizations;
    @Autowired OrganizationMembershipRepository memberships;
    @Autowired RoleDefinitionRepository roles;
    @Autowired UserRepository users;

    static String unique(String prefix) {
        return prefix + "-" + SEQUENCE.incrementAndGet() + "-" + System.nanoTime() % 100_000;
    }

    MockHttpServletRequestBuilder registration(String handle) {
        return post("/api/auth/register")
                .header(ClientNetworks.CLIENT_ADDRESS_HEADER, "network-" + unique("registration"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new Registration(unique("user") + "@example.test", PASSWORD, "Ada Lovelace", handle)));
    }

    private record Registration(String email, String password, String fullName, String username) {
    }

    String json(Object body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (Exception failure) {
            throw new IllegalStateException(failure);
        }
    }

    User registered(String handle) throws Exception {
        mockMvc.perform(registration(handle)).andExpect(status().isCreated());
        return users.findAll().stream().filter(user -> user.getUsername().equals(handle)).findFirst().orElseThrow();
    }

    Organization personalOf(User user) {
        return organizations.findByOwnerUserId(user.getId()).orElseThrow();
    }

    MockHttpServletRequestBuilder as(User user, MockHttpServletRequestBuilder request) {
        return signedIn(request, user.getId());
    }

    MockHttpServletRequestBuilder asSuperadmin(User user, MockHttpServletRequestBuilder request) {
        return signedIn(request, user.getId(), SystemRole.SUPERADMIN);
    }

    MockHttpServletRequestBuilder creatingOrganization(User user, String name, String slug) {
        return as(user, post(ORGANIZATIONS)).contentType(MediaType.APPLICATION_JSON)
                .content(json(new NewOrganization(name, slug)));
    }

    private record NewOrganization(String name, String slug) {
    }

    long createdOrganization(User user, String name, String slug) throws Exception {
        MvcResult created = mockMvc.perform(creatingOrganization(user, name, slug))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
    }
}
