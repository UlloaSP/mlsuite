package dev.ulloasp.mlsuite.security.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@ExtendWith(MockitoExtension.class)
class OAuth2ExternalIdentityExtractorTest {

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private OAuth2User user;

    private final OAuth2ExternalIdentityExtractor extractor = new OAuth2ExternalIdentityExtractor();

    @Test
    void extract_UsesGithubIdClaim() {
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(authentication.getPrincipal()).thenReturn(user);
        when(user.getAttribute("id")).thenReturn(12345);

        ExternalIdentity identity = extractor.extract(authentication);

        assertEquals(OAuthProvider.GITHUB, identity.provider());
        assertEquals("12345", identity.subject());
    }

    @Test
    void extract_UsesGoogleSubClaim() {
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(authentication.getPrincipal()).thenReturn(user);
        when(user.getAttribute("sub")).thenReturn("sub-1");

        ExternalIdentity identity = extractor.extract(authentication);

        assertEquals(OAuthProvider.GOOGLE, identity.provider());
        assertEquals("sub-1", identity.subject());
    }
}
