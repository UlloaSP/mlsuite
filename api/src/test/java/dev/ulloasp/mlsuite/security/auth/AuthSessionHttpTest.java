package dev.ulloasp.mlsuite.security.auth;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.function.Consumer;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * A session begins under a new id at sign-in and lasts only while its account is what it was then:
 * disabling, deleting, or changing the password or system role of the account ends it on its next request.
 */
class AuthSessionHttpTest extends AuthHttpFixture {

    @Test
    void signInRotatesAnExistingSessionId() throws Exception {
        MockHttpSession planted = new MockHttpSession(null, "planted-session-id");

        MockHttpSession session = (MockHttpSession) mockMvc.perform(login(PASSWORD).session(planted))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);

        assertNotNull(session);
        assertNotEquals("planted-session-id", session.getId());
        assertNotNull(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY));
        mockMvc.perform(get(ME).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(account.getEmail()));
    }

    @Test
    void signInWithoutASessionStartsOne() throws Exception {
        MockHttpSession session = signIn();

        mockMvc.perform(get(ME).session(session)).andExpect(status().isOk());
    }

    @Test
    void disablingTheAccountEndsItsSession() throws Exception {
        assertSessionEndsWhen(user -> user.setEnabled(false));
    }

    @Test
    void resettingThePasswordEndsTheSession() throws Exception {
        assertSessionEndsWhen(user -> user.setPasswordHash(passwordEncoder.encode("another-password-entirely")));
    }

    @Test
    void changingTheSystemRoleEndsTheSession() throws Exception {
        assertSessionEndsWhen(user -> user.setSystemRole(SystemRole.SUPERADMIN));
    }

    @Test
    void deletingTheAccountEndsItsSession() throws Exception {
        MockHttpSession session = signIn();
        account = null;

        mockMvc.perform(get(ME).session(session)).andExpect(status().isUnauthorized());
        assertTrue(session.isInvalid());
    }

    @Test
    void aDisabledAccountCannotSignIn() throws Exception {
        account.setEnabled(false);

        mockMvc.perform(login(PASSWORD)).andExpect(status().isForbidden());
    }

    @Test
    void aWrongPasswordIsUnauthorizedAndStartsNoSession() throws Exception {
        var request = mockMvc.perform(login("not-the-password"))
                .andExpect(status().isUnauthorized())
                .andReturn().getRequest();

        assertTrue(request.getSession(false) == null
                || request.getSession(false).getAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY) == null);
    }

    private void assertSessionEndsWhen(Consumer<User> change) throws Exception {
        MockHttpSession session = signIn();
        mockMvc.perform(get(ME).session(session)).andExpect(status().isOk());

        change.accept(account);

        mockMvc.perform(get(ME).session(session)).andExpect(status().isUnauthorized());
        assertTrue(session.isInvalid(), "the stale session must be invalidated, not only refused");
    }

    private MockHttpSession signIn() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(login(PASSWORD))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
        assertNotNull(session);
        return session;
    }
}
