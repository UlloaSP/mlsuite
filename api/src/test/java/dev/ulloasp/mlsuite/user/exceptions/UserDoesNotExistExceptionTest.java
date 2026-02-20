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

class UserDoesNotExistExceptionTest {

    @Test
    void constructor_WithProviderAndOAuthId_ShouldCreateException() {
        // Given
        String provider = "google";
        String oauthId = "123456789";

        // When
        UserDoesNotExistException exception = new UserDoesNotExistException(provider, oauthId);

        // Then
        String expectedMessage = "User with OAuth provider 'google' and ID '123456789' does not exist";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullProvider_ShouldCreateException() {
        // Given
        String provider = null;
        String oauthId = "123456789";

        // When
        UserDoesNotExistException exception = new UserDoesNotExistException(provider, oauthId);

        // Then
        String expectedMessage = "User with OAuth provider 'null' and ID '123456789' does not exist";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullOAuthId_ShouldCreateException() {
        // Given
        String provider = "github";
        String oauthId = null;

        // When
        UserDoesNotExistException exception = new UserDoesNotExistException(provider, oauthId);

        // Then
        String expectedMessage = "User with OAuth provider 'github' and ID 'null' does not exist";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithEmptyValues_ShouldCreateException() {
        // Given
        String provider = "";
        String oauthId = "";

        // When
        UserDoesNotExistException exception = new UserDoesNotExistException(provider, oauthId);

        // Then
        String expectedMessage = "User with OAuth provider '' and ID '' does not exist";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithDifferentProviders_ShouldCreateCorrectMessage() {
        // Given & When & Then
        UserDoesNotExistException googleException = new UserDoesNotExistException("google", "google123");
        assertEquals("User with OAuth provider 'google' and ID 'google123' does not exist",
                googleException.getMessage());

        UserDoesNotExistException githubException = new UserDoesNotExistException("github", "github456");
        assertEquals("User with OAuth provider 'github' and ID 'github456' does not exist",
                githubException.getMessage());

        UserDoesNotExistException systemException = new UserDoesNotExistException("system", "system789");
        assertEquals("User with OAuth provider 'system' and ID 'system789' does not exist",
                systemException.getMessage());
    }

    @Test
    void inheritance_ShouldExtendRuntimeException() {
        // Given
        UserDoesNotExistException exception = new UserDoesNotExistException("google", "123");

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
        UserDoesNotExistException exception = new UserDoesNotExistException(provider, oauthId);

        // When
        String toString = exception.toString();

        // Then
        assertTrue(toString.contains("UserDoesNotExistException"));
        assertTrue(toString.contains("google"));
        assertTrue(toString.contains("123456789"));
    }

    @Test
    void stackTrace_ShouldBeAvailable() {
        // Given
        UserDoesNotExistException exception = new UserDoesNotExistException("google", "123");

        // When
        StackTraceElement[] stackTrace = exception.getStackTrace();

        // Then
        assertNotNull(stackTrace);
        assertTrue(stackTrace.length > 0);
    }
}
