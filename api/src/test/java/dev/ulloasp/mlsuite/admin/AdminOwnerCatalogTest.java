package dev.ulloasp.mlsuite.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** The users a superadmin may make an organization's owner, searched on PostgreSQL. */
class AdminOwnerCatalogTest extends PublicPredictionFixture {
    private static final String PATH = "/api/admin/users/owner-candidates/catalog";

    @Test
    void searchTreatsWildcardCharactersLiterallyAndLeavesOutDisabledUsers() throws Exception {
        String marker = "owner %_" + schema.getId();
        inTransaction(() -> {
            entityManager.find(User.class, owner.getId()).setFullName("Literal " + marker);
            User disabled = new User("disabled-" + schema.getId(), "disabled-" + schema.getId() + "@test.example",
                    "unused", "Disabled " + marker, SystemRole.USER);
            disabled.setEnabled(false);
            entityManager.persist(disabled);
        });

        mockMvc.perform(signedIn(get(PATH).param("search", marker.toUpperCase()), owner.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(owner.getId()));
        // "%_" as wildcards would match every user; as text it matches only names that contain it.
        mockMvc.perform(signedIn(get(PATH).param("search", "x%_" + schema.getId()), owner.getId(),
                SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void onlyASuperadminMayReadIt() throws Exception {
        mockMvc.perform(signedIn(get(PATH), owner.getId())).andExpect(status().isForbidden());
        mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
    }
}
