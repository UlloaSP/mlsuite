package dev.ulloasp.mlsuite.security.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.security.identity.ClientNetworks;

/** A person changing their own password: it needs the current one and ends every other session. */
class PasswordChangeHttpTest extends AuthHttpFixture {

    private static final String NEW_PASSWORD = "a-brand-new-passphrase";

    @Autowired
    AuditLogService auditLog;

    private MockHttpSession signedIn() throws Exception {
        return (MockHttpSession) mockMvc.perform(login(PASSWORD)).andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    private ResultActions change(MockHttpSession session, String current, String next) throws Exception {
        return mockMvc.perform(post("/api/users/me/password").session(session)
                .header(ClientNetworks.CLIENT_ADDRESS_HEADER, network)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(current, next)));
    }

    @Test
    void theSessionThatAskedGoesOnAndEveryOtherEnds() throws Exception {
        MockHttpSession here = signedIn();
        MockHttpSession elsewhere = signedIn();
        String idBefore = here.getId();

        change(here, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        assertNotEquals(idBefore, here.getId());
        mockMvc.perform(get(ME).session(here)).andExpect(status().isOk());
        mockMvc.perform(get(ME).session(elsewhere)).andExpect(status().isUnauthorized());
    }

    @Test
    void theNewPasswordSignsInAndTheOldOneNoLonger() throws Exception {
        change(signedIn(), PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        mockMvc.perform(login(NEW_PASSWORD)).andExpect(status().isOk());
        mockMvc.perform(login(PASSWORD)).andExpect(status().isUnauthorized());
    }

    @Test
    void theChangeIsAuditedWithoutThePassword() throws Exception {
        change(signedIn(), PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());

        verify(auditLog).record(any(), eq(null), eq(AuditAction.USER_PASSWORD_CHANGE), eq(7L));
    }

    @Test
    void aWrongCurrentPasswordChangesNothingAndKeepsTheSession() throws Exception {
        MockHttpSession session = signedIn();

        change(session, "not-the-password", NEW_PASSWORD).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("That is not your current password."));

        assertTrue(passwordEncoder.matches(PASSWORD, account.getPasswordHash()));
        mockMvc.perform(get(ME).session(session)).andExpect(status().isOk());
        verify(auditLog, never()).record(any(), any(), eq(AuditAction.USER_PASSWORD_CHANGE), any());
    }

    @Test
    void guessesOfTheCurrentPasswordRunOutLikeFailedSignIns() throws Exception {
        MockHttpSession session = signedIn();

        for (int attempt = 0; attempt < 3; attempt++) {
            change(session, "not-the-password", NEW_PASSWORD).andExpect(status().isBadRequest());
        }

        change(session, PASSWORD, NEW_PASSWORD).andExpect(status().isTooManyRequests());
        assertFalse(passwordEncoder.matches(NEW_PASSWORD, account.getPasswordHash()));
    }

    @Test
    void aNewPasswordMustBeLongEnoughAndNew() throws Exception {
        MockHttpSession session = signedIn();

        change(session, PASSWORD, "too-short").andExpect(status().isBadRequest());
        change(session, PASSWORD, PASSWORD).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose a password different from your current one."));
        assertTrue(passwordEncoder.matches(PASSWORD, account.getPasswordHash()));
    }

    @Test
    void changingItNeedsASession() throws Exception {
        mockMvc.perform(post("/api/users/me/password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"}".formatted(PASSWORD, NEW_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }
}
