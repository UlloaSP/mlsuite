/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.exceptions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PredictionDoesNotExistsExceptionTest {

    @Test
    void constructor_WithPredictionIdAndUserDisplayName_ShouldCreateException() {
        // Given
        Long predictionId = 123L;
        String userDisplayName = "John Doe";

        // When
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // Then
        String expectedMessage = "Prediction with ID '123' does not exist for user: John Doe";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullPredictionId_ShouldCreateException() {
        // Given
        Long predictionId = null;
        String userDisplayName = "Jane Smith";

        // When
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // Then
        String expectedMessage = "Prediction with ID 'null' does not exist for user: Jane Smith";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullUserDisplayName_ShouldCreateException() {
        // Given
        Long predictionId = 456L;
        String userDisplayName = null;

        // When
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // Then
        String expectedMessage = "Prediction with ID '456' does not exist for user: null";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithZeroPredictionId_ShouldCreateException() {
        // Given
        Long predictionId = 0L;
        String userDisplayName = "Test User";

        // When
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // Then
        String expectedMessage = "Prediction with ID '0' does not exist for user: Test User";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNegativePredictionId_ShouldCreateException() {
        // Given
        Long predictionId = -1L;
        String userDisplayName = "Negative Test User";

        // When
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // Then
        String expectedMessage = "Prediction with ID '-1' does not exist for user: Negative Test User";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void inheritance_ShouldExtendRuntimeException() {
        // Given
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(123L, "User");

        // When & Then
        assertTrue(exception instanceof RuntimeException);
        assertTrue(exception instanceof Exception);
        assertTrue(exception instanceof Throwable);
    }

    @Test
    void toString_ShouldContainExceptionDetails() {
        // Given
        Long predictionId = 789L;
        String userDisplayName = "Test User";
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(predictionId,
                userDisplayName);

        // When
        String toString = exception.toString();

        // Then
        assertTrue(toString.contains("PredictionDoesNotExistsException"));
        assertTrue(toString.contains("789"));
        assertTrue(toString.contains("Test User"));
    }

    @Test
    void stackTrace_ShouldBeAvailable() {
        // Given
        PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(123L, "User");

        // When
        StackTraceElement[] stackTrace = exception.getStackTrace();

        // Then
        assertNotNull(stackTrace);
        assertTrue(stackTrace.length > 0);
    }
}
