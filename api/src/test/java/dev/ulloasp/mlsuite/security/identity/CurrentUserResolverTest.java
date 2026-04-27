package dev.ulloasp.mlsuite.security.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.security.local.LocalUserDetails;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class CurrentUserResolverTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private Authentication authentication;

    private CurrentUserResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new CurrentUserResolver(userLookupService);
    }

    @Test
    void resolve_BuildsCurrentUserFromResolvedUser() {
        User user = new User();
        user.setId(4L);
        user.setUsername("alice");
        when(authentication.getPrincipal()).thenReturn(
                new LocalUserDetails(4L, "alice", "alice@example.com", "hash", null));
        when(userLookupService.requireById(4L)).thenReturn(user);

        CurrentUser currentUser = resolver.resolve(authentication);

        assertEquals(4L, currentUser.userId());
        assertEquals("alice", currentUser.username());
    }

    @Test
    void resolve_PropagatesMissingUser() {
        when(authentication.getPrincipal()).thenReturn(
                new LocalUserDetails(4L, "alice", "alice@example.com", "hash", null));
        when(userLookupService.requireById(4L)).thenThrow(new UserDoesNotExistException(4L));

        assertThrows(UserDoesNotExistException.class, () -> resolver.resolve(authentication));
    }
}
