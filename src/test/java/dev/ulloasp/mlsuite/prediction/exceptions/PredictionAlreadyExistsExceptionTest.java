package dev.ulloasp.mlsuite.prediction.exceptions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PredictionAlreadyExistsExceptionTest {

    @Test
    void constructor_WithPredictionNameAndSignatureName_ShouldCreateException() {
        // Given
        String predictionName = "Sales Prediction 2024";
        String signatureName = "sales_model_v1";

        // When
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // Then
        String expectedMessage = "Signature with name 'sales_model_v1' already has a prediction with name 'Sales Prediction 2024'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullPredictionName_ShouldCreateException() {
        // Given
        String predictionName = null;
        String signatureName = "test_signature";

        // When
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // Then
        String expectedMessage = "Signature with name 'test_signature' already has a prediction with name 'null'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithNullSignatureName_ShouldCreateException() {
        // Given
        String predictionName = "Test Prediction";
        String signatureName = null;

        // When
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // Then
        String expectedMessage = "Signature with name 'null' already has a prediction with name 'Test Prediction'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithEmptyStrings_ShouldCreateException() {
        // Given
        String predictionName = "";
        String signatureName = "";

        // When
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // Then
        String expectedMessage = "Signature with name '' already has a prediction with name ''";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void constructor_WithSpecialCharacters_ShouldCreateException() {
        // Given
        String predictionName = "Prediction with spaces & symbols!";
        String signatureName = "signature_with_underscores_123";

        // When
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // Then
        String expectedMessage = "Signature with name 'signature_with_underscores_123' already has a prediction with name 'Prediction with spaces & symbols!'";
        assertEquals(expectedMessage, exception.getMessage());
        assertNull(exception.getCause());
    }

    @Test
    void inheritance_ShouldExtendRuntimeException() {
        // Given
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException("test", "signature");

        // When & Then
        assertTrue(exception instanceof RuntimeException);
        assertTrue(exception instanceof Exception);
        assertTrue(exception instanceof Throwable);
    }

    @Test
    void toString_ShouldContainExceptionDetails() {
        // Given
        String predictionName = "Test Prediction";
        String signatureName = "test_signature";
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException(predictionName,
                signatureName);

        // When
        String toString = exception.toString();

        // Then
        assertTrue(toString.contains("PredictionAlreadyExistsException"));
        assertTrue(toString.contains("Test Prediction"));
        assertTrue(toString.contains("test_signature"));
    }

    @Test
    void stackTrace_ShouldBeAvailable() {
        // Given
        PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException("test", "signature");

        // When
        StackTraceElement[] stackTrace = exception.getStackTrace();

        // Then
        assertNotNull(stackTrace);
        assertTrue(stackTrace.length > 0);
    }
}
