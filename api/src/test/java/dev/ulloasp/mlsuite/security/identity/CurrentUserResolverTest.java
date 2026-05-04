package dev.ulloasp.mlsuite.security.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class CurrentUserResolverTest {

    @Mock
    private OAuth2ExternalIdentityExtractor extractor;

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private CurrentUserResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new CurrentUserResolver(extractor, userLookupService);
    }

    @Test
    void resolve_BuildsCurrentUserFromResolvedUser() {
        User user = new User();
        user.setId(4L);
        user.setUsername("alice");
        ExternalIdentity identity = new ExternalIdentity(null, "ext-1");
        when(extractor.extract(authentication)).thenReturn(identity);
        when(userLookupService.requireByExternalIdentity(identity)).thenReturn(user);

        CurrentUser currentUser = resolver.resolve(authentication);

        assertEquals(4L, currentUser.userId());
        assertEquals("alice", currentUser.username());
    }

    @Test
    void resolve_PropagatesMissingUser() {
        ExternalIdentity identity = new ExternalIdentity(null, "ext-1");
        when(extractor.extract(authentication)).thenReturn(identity);
        when(userLookupService.requireByExternalIdentity(identity)).thenThrow(new UserDoesNotExistException("github", "ext-1"));

        assertThrows(UserDoesNotExistException.class, () -> resolver.resolve(authentication));
    }
}

