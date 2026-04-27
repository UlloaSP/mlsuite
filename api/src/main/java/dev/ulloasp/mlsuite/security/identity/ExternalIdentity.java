package dev.ulloasp.mlsuite.security.identity;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public record ExternalIdentity(OAuthProvider provider, String subject) {
}
