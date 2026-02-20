/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.exceptions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class UserAlreadyExistsExceptionTest {

    @Test
    void constructor_WithProviderAndOAuthId_ShouldCreateException() {
        // Given
        String provider = "google";
        String oauthId = "123456789";

        // When
        UserAlreadyExistsException exception = new UserAlreadyExistsException(provider, oauthId);

        // Then
        String expectedMessage = "User already exists with OAuth provider 'google' and ID '123456789'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullProvider_ShouldCreateException() {
        // Given
        String provider = null;
        String oauthId = "123456789";

        // When
        UserAlreadyExistsException exception = new UserAlreadyExistsException(provider, oauthId);

        // Then
        String expectedMessage = "User already exists with OAuth provider 'null' and ID '123456789'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullOAuthId_ShouldCreateException() {
        // Given
        String provider = "github";
        String oauthId = null;

        // When
        UserAlreadyExistsException exception = new UserAlreadyExistsException(provider, oauthId);

        // Then
        String expectedMessage = "User already exists with OAuth provider 'github' and ID 'null'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithEmptyValues_ShouldCreateException() {
        // Given
        String provider = "";
        String oauthId = "";

        // When
        UserAlreadyExistsException exception = new UserAlreadyExistsException(provider, oauthId);

        // Then
        String expectedMessage = "User already exists with OAuth provider '' and ID ''";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithDifferentProviders_ShouldCreateCorrectMessage() {
        // Given & When & Then
        UserAlreadyExistsException googleException = new UserAlreadyExistsException("google", "google123");
        assertEquals("User already exists with OAuth provider 'google' and ID 'google123'",
                googleException.getMessage());

        UserAlreadyExistsException githubException = new UserAlreadyExistsException("github", "github456");
        assertEquals("User already exists with OAuth provider 'github' and ID 'github456'",
                githubException.getMessage());

        UserAlreadyExistsException systemException = new UserAlreadyExistsException("system", "system789");
        assertEquals("User already exists with OAuth provider 'system' and ID 'system789'",
                systemException.getMessage());
    }

    @Test
    void inheritance_ShouldExtendRuntimeException() {
        // Given
        UserAlreadyExistsException exception = new UserAlreadyExistsException("google", "123");

        // When & Then
        assertTrue(exception instanceof RuntimeException);
        assertTrue(exception instanceof Exception);
        assertTrue(exception instanceof Throwable);
    }

    @Test
    void toString_ShouldContainExceptionDetails() {
        // Given
        String provider = "google";
        String oauthId = "123456789";
        UserAlreadyExistsException exception = new UserAlreadyExistsException(provider, oauthId);

        // When
        String toString = exception.toString();

        // Then
        assertTrue(toString.contains("UserAlreadyExistsException"));
        assertTrue(toString.contains("google"));
        assertTrue(toString.contains("123456789"));
    }

    @Test
    void stackTrace_ShouldBeAvailable() {
        // Given
        UserAlreadyExistsException exception = new UserAlreadyExistsException("google", "123");

        // When
        StackTraceElement[] stackTrace = exception.getStackTrace();

        // Then
        assertNotNull(stackTrace);
        assertTrue(stackTrace.length > 0);
    }
}
