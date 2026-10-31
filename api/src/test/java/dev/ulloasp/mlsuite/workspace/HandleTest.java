package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.admin.AdminUpdateUserRequest;
import dev.ulloasp.mlsuite.organization.domain.exception.HandleTakenException;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** The namespace usernames and organization slugs share, on PostgreSQL. */
class HandleTest extends PersonalAccountFixture {

    @ParameterizedTest
    @ValueSource(strings = { "-ada", "ada-", "a--b", "a.b", "a_b", "ada lovelace", "ñandú",
            "a2345678901234567890123456789012345678x9" })
    void malformedHandlesAreRejectedBeforeAnythingIsCreated(String handle) throws Exception {
        User creator = registered(unique("creator"));
        long before = count("User");

        mockMvc.perform(registration(handle))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("handle")));
        mockMvc.perform(creatingOrganization(creator, "Team", handle))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("handle")));

        assertEquals(before, count("User"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "admin", "Login", "api", "explore", "settings", "workspace" })
    void reservedHandlesAreRejected(String handle) throws Exception {
        mockMvc.perform(registration(handle))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("reserved")));
        mockMvc.perform(creatingOrganization(registered(unique("creator")), handle, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("reserved")));
    }

    @Test
    void anOrganizationCannotTakeAUsersHandleNorAUserAnOrganizations() throws Exception {
        User user = registered(unique("shared"));
        mockMvc.perform(creatingOrganization(user, "Team", user.getUsername().toUpperCase()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already taken")));

        String slug = unique("team");
        createdOrganization(user, "Team", slug);

        mockMvc.perform(registration(slug.toUpperCase()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already taken")));
        assertThrows(HandleTakenException.class, () -> adminUsers.update(owner.getId(), user.getId(),
                new AdminUpdateUserRequest(null, slug, null, null)));
    }

    @Test
    void aHandleIsStoredLowercase() throws Exception {
        String handle = unique("mixed");

        mockMvc.perform(registration(handle.toUpperCase())).andExpect(status().isCreated());

        assertEquals(1, users.findAll().stream().filter(user -> user.getUsername().equals(handle)).count());
    }

    @Test
    void anOrganizationCreatedWithoutAHandleReadsItFromItsName() throws Exception {
        String name = unique("Mixed Case") + " !!";

        long team = createdOrganization(registered(unique("creator")), name, null);

        assertEquals(name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("-$", ""),
                organizations.findById(team).orElseThrow().getSlug());
    }

    /** A check that passes for both requests still leaves one account, and a clear answer for the other. */
    @Test
    void concurrentRegistrationsOfOneHandleLeaveOneAccount() throws Exception {
        String handle = unique("race");
        CountDownLatch start = new CountDownLatch(1);
        List<CompletableFuture<MvcResult>> attempts = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            MockHttpServletRequestBuilder attempt = registration(handle);
            attempts.add(CompletableFuture.supplyAsync(() -> {
                try {
                    start.await();
                    return mockMvc.perform(attempt).andReturn();
                } catch (Exception failure) {
                    throw new IllegalStateException(failure);
                }
            }));
        }

        start.countDown();

        List<MvcResult> results = attempts.stream().map(CompletableFuture::join).toList();
        assertEquals(1, results.stream().filter(result -> result.getResponse().getStatus() == 201).count());
        for (MvcResult result : results) {
            if (result.getResponse().getStatus() != 201) {
                assertEquals(409, result.getResponse().getStatus());
                assertTrue(result.getResponse().getContentAsString().contains("taken"));
            }
        }
        assertEquals(1, users.findAll().stream().filter(user -> user.getUsername().equals(handle)).count());
        assertTrue(organizations.findBySlug(handle).isPresent());
    }

    /** The constraint is what decides that race, so its answer is pinned without timing. */
    @Test
    void aHandleLostToTheDatabaseIsStillAClearConflict() throws Exception {
        String handle = unique("lost");
        inTransaction(() -> entityManager.persist(
                new User(handle, handle + "@example.test", "unused", "Lost", SystemRole.USER)));

        mockMvc.perform(registration(handle))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("That handle was just taken."));
    }
}
