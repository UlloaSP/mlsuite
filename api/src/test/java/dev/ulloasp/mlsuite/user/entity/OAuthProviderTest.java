/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.entity;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class OAuthProviderTest {

    @Test
    void getDisplayName_ShouldReturnCorrectDisplayName() {
        // When & Then
        assertEquals("system", OAuthProvider.SYSTEM.getDisplayName());
        assertEquals("google", OAuthProvider.GOOGLE.getDisplayName());
        assertEquals("github", OAuthProvider.GITHUB.getDisplayName());
    }

    @Test
    void getProviderName_ShouldReturnLowercaseName() {
        // When & Then
        assertEquals("system", OAuthProvider.SYSTEM.getProviderName());
        assertEquals("google", OAuthProvider.GOOGLE.getProviderName());
        assertEquals("github", OAuthProvider.GITHUB.getProviderName());
    }

    @Test
    void fromString_ValidProvider_ShouldReturnCorrectEnum() {
        // When & Then
        assertEquals(OAuthProvider.SYSTEM, OAuthProvider.fromString("system"));
        assertEquals(OAuthProvider.SYSTEM, OAuthProvider.fromString("SYSTEM"));
        assertEquals(OAuthProvider.GOOGLE, OAuthProvider.fromString("google"));
        assertEquals(OAuthProvider.GOOGLE, OAuthProvider.fromString("GOOGLE"));
        assertEquals(OAuthProvider.GITHUB, OAuthProvider.fromString("github"));
        assertEquals(OAuthProvider.GITHUB, OAuthProvider.fromString("GITHUB"));
    }

    @Test
    void fromString_InvalidProvider_ShouldThrowException() {
        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> OAuthProvider.fromString("invalid"));
        assertEquals("Unsupported OAuth provider: invalid", exception.getMessage());
    }

    @Test
    void fromString_EmptyString_ShouldThrowException() {
        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> OAuthProvider.fromString(""));
        assertEquals("Unsupported OAuth provider: ", exception.getMessage());
    }

    @Test
    void isSupported_ValidProvider_ShouldReturnTrue() {
        // When & Then
        assertTrue(OAuthProvider.isSupported("system"));
        assertTrue(OAuthProvider.isSupported("SYSTEM"));
        assertTrue(OAuthProvider.isSupported("google"));
        assertTrue(OAuthProvider.isSupported("GOOGLE"));
        assertTrue(OAuthProvider.isSupported("github"));
        assertTrue(OAuthProvider.isSupported("GITHUB"));
    }

    @Test
    void isSupported_InvalidProvider_ShouldReturnFalse() {
        // When & Then
        assertFalse(OAuthProvider.isSupported("invalid"));
        assertFalse(OAuthProvider.isSupported("facebook"));
        assertFalse(OAuthProvider.isSupported("twitter"));
        assertFalse(OAuthProvider.isSupported(""));
        assertFalse(OAuthProvider.isSupported(null));
    }

    @Test
    void toString_ShouldReturnDisplayName() {
        // When & Then
        assertEquals("system", OAuthProvider.SYSTEM.toString());
        assertEquals("google", OAuthProvider.GOOGLE.toString());
        assertEquals("github", OAuthProvider.GITHUB.toString());
    }

    @Test
    void values_ShouldReturnAllProviders() {
        // When
        OAuthProvider[] providers = OAuthProvider.values();

        // Then
        assertEquals(3, providers.length);
        assertArrayEquals(
                new OAuthProvider[] { OAuthProvider.SYSTEM, OAuthProvider.GOOGLE, OAuthProvider.GITHUB },
                providers);
    }

    @Test
    void valueOf_ValidName_ShouldReturnCorrectEnum() {
        // When & Then
        assertEquals(OAuthProvider.SYSTEM, OAuthProvider.valueOf("SYSTEM"));
        assertEquals(OAuthProvider.GOOGLE, OAuthProvider.valueOf("GOOGLE"));
        assertEquals(OAuthProvider.GITHUB, OAuthProvider.valueOf("GITHUB"));
    }

    @Test
    void valueOf_InvalidName_ShouldThrowException() {
        // When & Then
        assertThrows(IllegalArgumentException.class, () -> OAuthProvider.valueOf("INVALID"));
        assertThrows(IllegalArgumentException.class, () -> OAuthProvider.valueOf("system")); // lowercase
    }
}
