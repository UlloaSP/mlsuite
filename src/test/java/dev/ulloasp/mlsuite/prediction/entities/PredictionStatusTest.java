package dev.ulloasp.mlsuite.prediction.entities;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PredictionStatusTest {

    @Test
    void values_ShouldReturnAllStatuses() {
        // When
        PredictionStatus[] statuses = PredictionStatus.values();

        // Then
        assertEquals(3, statuses.length);
        assertArrayEquals(
                new PredictionStatus[] { PredictionStatus.PENDING, PredictionStatus.COMPLETED,
                        PredictionStatus.FAILED },
                statuses);
    }

    @Test
    void valueOf_ValidName_ShouldReturnCorrectEnum() {
        // When & Then
        assertEquals(PredictionStatus.PENDING, PredictionStatus.valueOf("PENDING"));
        assertEquals(PredictionStatus.COMPLETED, PredictionStatus.valueOf("COMPLETED"));
        assertEquals(PredictionStatus.FAILED, PredictionStatus.valueOf("FAILED"));
    }

    @Test
    void valueOf_InvalidName_ShouldThrowException() {
        // When & Then
        assertThrows(IllegalArgumentException.class, () -> PredictionStatus.valueOf("INVALID"));
        assertThrows(IllegalArgumentException.class, () -> PredictionStatus.valueOf("pending")); // lowercase
    }

    @Test
    void name_ShouldReturnCorrectName() {
        // When & Then
        assertEquals("PENDING", PredictionStatus.PENDING.name());
        assertEquals("COMPLETED", PredictionStatus.COMPLETED.name());
        assertEquals("FAILED", PredictionStatus.FAILED.name());
    }

    @Test
    void toString_ShouldReturnName() {
        // When & Then
        assertEquals("PENDING", PredictionStatus.PENDING.toString());
        assertEquals("COMPLETED", PredictionStatus.COMPLETED.toString());
        assertEquals("FAILED", PredictionStatus.FAILED.toString());
    }

    @Test
    void ordinal_ShouldReturnCorrectOrder() {
        // When & Then
        assertEquals(0, PredictionStatus.PENDING.ordinal());
        assertEquals(1, PredictionStatus.COMPLETED.ordinal());
        assertEquals(2, PredictionStatus.FAILED.ordinal());
    }

    @Test
    void compareTo_ShouldFollowOrdinalOrder() {
        // When & Then
        assertTrue(PredictionStatus.PENDING.compareTo(PredictionStatus.COMPLETED) < 0);
        assertTrue(PredictionStatus.COMPLETED.compareTo(PredictionStatus.FAILED) < 0);
        assertTrue(PredictionStatus.FAILED.compareTo(PredictionStatus.PENDING) > 0);
        assertEquals(0, PredictionStatus.PENDING.compareTo(PredictionStatus.PENDING));
    }
}
