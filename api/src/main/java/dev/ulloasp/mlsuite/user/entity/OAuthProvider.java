/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.entity;

/**
 * Enumeration representing the supported OAuth2 providers. Corresponds to the
 * oauth_provider_enum in the database.
 */
public enum OAuthProvider {

    SYSTEM("system"),
    GOOGLE("google"),
    GITHUB("github");

    private final String displayName;

    OAuthProvider(String displayName) {
        this.displayName = displayName;
    }

    /**
     * Gets the display name for the OAuth provider
     */
    public String getDisplayName() {
        return displayName;
    }

    /**
     * Gets the provider name in lowercase for OAuth2 configuration
     */
    public String getProviderName() {
        return name().toLowerCase();
    }

    /**
     * Converts a string to the corresponding OAuthProvider enum
     */
    public static OAuthProvider fromString(String provider) {
        if (provider == null) {
            throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }

        try {
            return OAuthProvider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }
    }

    /**
     * Checks if the given provider string is supported
     */
    public static boolean isSupported(String provider) {
        try {
            fromString(provider);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public String toString() {
        return displayName;
    }
}
