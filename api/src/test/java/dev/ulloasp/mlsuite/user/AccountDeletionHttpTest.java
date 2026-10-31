package dev.ulloasp.mlsuite.user;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Closing one's own account: the checks, in order, and what happens at once. */
class AccountDeletionHttpTest extends PublicPredictionFixture {

    private static final String PASSWORD = "correct horse";

    @Autowired PasswordEncoder encoder;
    private JdbcTemplate jdbc;

    @BeforeEach
    void anAccountWithAPassword() {
        jdbc = new JdbcTemplate(dataSource);
        authorizeOwner();
        jdbc.update("UPDATE app_user SET password_hash = ? WHERE id = ?", encoder.encode(PASSWORD), owner.getId());
        inTransaction(() -> entityManager.persist(Organization.personal(entityManager.find(User.class, owner.getId()))));
    }

    private ResultActions close(String password, long userId, SystemRole role) throws Exception {
        return mockMvc.perform(signedIn(delete("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("password", password))), userId, role));
    }

    private boolean enabled(long userId) {
        return jdbc.queryForObject("SELECT enabled FROM app_user WHERE id = ?", Boolean.class, userId);
    }

    @Test
    void aWrongPasswordChangesNothing() throws Exception {
        close("guess", owner.getId(), SystemRole.USER).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("current password")));
        assertTrue(enabled(owner.getId()));
    }

    @Test
    void theOnlyOwnerOfATeamWithContentIsToldWhatToDo() throws Exception {
        close(PASSWORD, owner.getId(), SystemRole.USER).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("only owner of Acme Health")))
                .andExpect(jsonPath("$.message", containsString("Transfer")));
        assertTrue(enabled(owner.getId()));
    }

    @Test
    void theLastSuperadminStays() throws Exception {
        jdbc.update("UPDATE app_user SET system_role = 'USER' WHERE system_role = 'SUPERADMIN'");
        jdbc.update("UPDATE app_user SET system_role = 'SUPERADMIN' WHERE id = ?", owner.getId());
        close(PASSWORD, owner.getId(), SystemRole.SUPERADMIN).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("last superadmin")));
    }

    @Test
    void theAccountClosesAtOnceAndItsPurgeIsQueued() throws Exception {
        jdbc.update("DELETE FROM organization_membership WHERE user_id = ? AND organization_id = ?", owner.getId(),
                organization.getId());

        var session = close(PASSWORD, owner.getId(), SystemRole.USER).andExpect(status().isNoContent())
                .andReturn().getRequest().getSession(false);

        assertTrue(session == null);
        assertFalse(enabled(owner.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM purge_job WHERE scope = 'USER' AND target_id = ?"
                + " AND requested_by_user_id = ?", Long.class, owner.getId(), owner.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = 'USER_DELETE'"
                + " AND target_id = ?", Long.class, owner.getId().toString()));
        jdbc.update("UPDATE purge_job SET status = 'COMPLETED' WHERE target_id = ?", owner.getId());
    }
}
