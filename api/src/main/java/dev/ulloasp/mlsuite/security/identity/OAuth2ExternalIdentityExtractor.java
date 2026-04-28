package dev.ulloasp.mlsuite.security.identity;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;

@Component
public class OAuth2ExternalIdentityExtractor {

    public ExternalIdentity extract(OAuth2AuthenticationToken authentication) {
        OAuthProvider provider = OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
        OAuth2User principal = authentication.getPrincipal();
        return new ExternalIdentity(provider, switch (provider) {
            case GITHUB -> attributeValue(principal, "id");
            case GOOGLE -> attributeValue(principal, "sub");
            default -> "";
        });
    }

    private String attributeValue(OAuth2User principal, String attributeName) {
        Object value = principal.getAttribute(attributeName);
        return value == null ? "" : value.toString();
    }
}

