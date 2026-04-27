package dev.ulloasp.mlsuite.security.oauth2;

import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.security.identity.ExternalIdentity;
import dev.ulloasp.mlsuite.security.identity.OAuth2ExternalIdentityExtractor;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@Component
public class OAuth2UserProfileExtractor {

    private final OAuth2ExternalIdentityExtractor externalIdentityExtractor;

    public OAuth2UserProfileExtractor(OAuth2ExternalIdentityExtractor externalIdentityExtractor) {
        this.externalIdentityExtractor = externalIdentityExtractor;
    }

    public OAuth2UserProfile extract(OAuth2AuthenticationToken authentication) {
        OAuth2User user = authentication.getPrincipal();
        ExternalIdentity identity = externalIdentityExtractor.extract(authentication);
        return switch (identity.provider()) {
            case GITHUB -> new OAuth2UserProfile(
                    identity,
                    stringAttribute(user, "login"),
                    stringAttribute(user, "email"),
                    stringAttribute(user, "avatar_url"),
                    stringAttribute(user, "name"));
            case GOOGLE -> new OAuth2UserProfile(
                    identity,
                    stringAttribute(user, "given_name"),
                    stringAttribute(user, "email"),
                    stringAttribute(user, "picture"),
                    stringAttribute(user, "name"));
            default -> new OAuth2UserProfile(
                    identity,
                    "",
                    stringAttribute(user, "email"),
                    "",
                    stringAttribute(user, "name"));
        };
    }

    private String stringAttribute(OAuth2User user, String attributeName) {
        Object value = user.getAttribute(attributeName);
        return value == null ? "" : value.toString();
    }
}
