package dev.ulloasp.mlsuite.security.oauth2;

import dev.ulloasp.mlsuite.security.identity.ExternalIdentity;

public record OAuth2UserProfile(
        ExternalIdentity identity,
        String username,
        String email,
        String avatarUrl,
        String fullName) {
}

