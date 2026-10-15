package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import dev.ulloasp.mlsuite.storage.ArtifactHash;

/**
 * The secret of an API client key: {@code mls_} and 32 random bytes in URL-safe base64. A key
 * is found by the SHA-256 of the whole secret, so the secret itself is never stored.
 */
final class ApiKeySecrets {

    static final int PREFIX_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private ApiKeySecrets() {
    }

    static String issue() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return "mls_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String secret) {
        return ArtifactHash.sha256(secret.getBytes(StandardCharsets.UTF_8));
    }

    static String prefix(String secret) {
        return secret.substring(0, PREFIX_LENGTH);
    }
}
