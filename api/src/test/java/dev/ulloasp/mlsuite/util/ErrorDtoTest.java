/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class ErrorDtoTest {

    @Test
    void constructor_ShouldCreateErrorDto() {
        // Given
        Instant timestamp = Instant.now();
        int status = 404;
        String message = "Not found";
        String path = "/api/test";

        // When
        ErrorDto errorDto = new ErrorDto(timestamp, status, message, path);

        // Then
        assertEquals(timestamp, errorDto.timestamp());
        assertEquals(status, errorDto.status());
        assertEquals(message, errorDto.message());
        assertEquals(path, errorDto.path());
    }

    @Test
    void of_ShouldCreateErrorDtoWithCurrentTimestamp() {
        // Given
        int status = 500;
        String message = "Internal server error";
        String path = "/api/error";
        Instant beforeCreation = Instant.now();

        // When
        ErrorDto errorDto = ErrorDto.of(status, message, path);

        // Then
        Instant afterCreation = Instant.now();
        assertEquals(status, errorDto.status());
        assertEquals(message, errorDto.message());
        assertEquals(path, errorDto.path());
        assertNotNull(errorDto.timestamp());
        assertTrue(errorDto.timestamp().compareTo(beforeCreation) >= 0);
        assertTrue(errorDto.timestamp().compareTo(afterCreation) <= 0);
    }

    @Test
    void of_WithNullMessage_ShouldCreateErrorDto() {
        // Given
        int status = 400;
        String message = null;
        String path = "/api/bad-request";

        // When
        ErrorDto errorDto = ErrorDto.of(status, message, path);

        // Then
        assertEquals(status, errorDto.status());
        assertNull(errorDto.message());
        assertEquals(path, errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void of_WithNullPath_ShouldCreateErrorDto() {
        // Given
        int status = 401;
        String message = "Unauthorized";
        String path = null;

        // When
        ErrorDto errorDto = ErrorDto.of(status, message, path);

        // Then
        assertEquals(status, errorDto.status());
        assertEquals(message, errorDto.message());
        assertNull(errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void equals_SameValues_ShouldBeEqual() {
        // Given
        Instant timestamp = Instant.now();
        ErrorDto errorDto1 = new ErrorDto(timestamp, 404, "Not found", "/api/test");
        ErrorDto errorDto2 = new ErrorDto(timestamp, 404, "Not found", "/api/test");

        // When & Then
        assertEquals(errorDto1, errorDto2);
        assertEquals(errorDto1.hashCode(), errorDto2.hashCode());
    }

    @Test
    void equals_DifferentValues_ShouldNotBeEqual() {
        // Given
        Instant timestamp = Instant.now();
        ErrorDto errorDto1 = new ErrorDto(timestamp, 404, "Not found", "/api/test");
        ErrorDto errorDto2 = new ErrorDto(timestamp, 500, "Internal error", "/api/test");

        // When & Then
        assertNotEquals(errorDto1, errorDto2);
    }

    @Test
    void toString_ShouldContainAllFields() {
        // Given
        Instant timestamp = Instant.now();
        ErrorDto errorDto = new ErrorDto(timestamp, 404, "Not found", "/api/test");

        // When
        String toString = errorDto.toString();

        // Then
        assertTrue(toString.contains("404"));
        assertTrue(toString.contains("Not found"));
        assertTrue(toString.contains("/api/test"));
        assertTrue(toString.contains(timestamp.toString()));
    }
}
