package dev.ulloasp.mlsuite.security.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

class CurrentUserArgumentResolverTest {

    private final CurrentUserArgumentResolver resolver = new CurrentUserArgumentResolver();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void supportsOnlyCurrentUserParameters() throws Exception {
        assertTrue(resolver.supportsParameter(parameter(0)));
        assertFalse(resolver.supportsParameter(parameter(1)));
    }

    @Test
    void resolvesTheAuthenticatedPrincipal() throws Exception {
        var principal = new AuthenticatedUserPrincipal(7L, "alice@example.com", "hash", SystemRole.SUPERADMIN, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        CurrentUser user = resolver.resolveArgument(parameter(0), null, null, null);

        assertEquals(new CurrentUser(7L, "alice@example.com", SystemRole.SUPERADMIN), user);
    }

    @Test
    void rejectsMissingOrForeignPrincipal() throws Exception {
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> resolver.resolveArgument(parameter(0), null, null, null));

        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("alice@example.com", null));
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> resolver.resolveArgument(parameter(0), null, null, null));
    }

    private MethodParameter parameter(int index) throws NoSuchMethodException {
        return new MethodParameter(Handler.class.getDeclaredMethod("handle", CurrentUser.class, String.class), index);
    }

    static class Handler {
        void handle(CurrentUser user, String other) {
        }
    }
}
