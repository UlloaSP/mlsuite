package dev.ulloasp.mlsuite.security.identity;

import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;

public record ExternalIdentity(OAuthProvider provider, String subject) {
}

