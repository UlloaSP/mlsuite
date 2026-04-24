package dev.ulloasp.mlsuite.prediction.entities;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PredictionStatusTest {

    @Test
    void values_ShouldReturnAllStatuses() {
        PredictionStatus[] statuses = PredictionStatus.values();

        assertEquals(2, statuses.length);
        assertArrayEquals(
                new PredictionStatus[] { PredictionStatus.PENDING, PredictionStatus.COMPLETED },
                statuses);
    }

    @Test
    void valueOf_ValidName_ShouldReturnCorrectEnum() {
        assertEquals(PredictionStatus.PENDING, PredictionStatus.valueOf("PENDING"));
        assertEquals(PredictionStatus.COMPLETED, PredictionStatus.valueOf("COMPLETED"));
    }

    @Test
    void valueOf_InvalidName_ShouldThrowException() {
        assertThrows(IllegalArgumentException.class, () -> PredictionStatus.valueOf("INVALID"));
        assertThrows(IllegalArgumentException.class, () -> PredictionStatus.valueOf("pending"));
    }

    @Test
    void name_ShouldReturnCorrectName() {
        assertEquals("PENDING", PredictionStatus.PENDING.name());
        assertEquals("COMPLETED", PredictionStatus.COMPLETED.name());
    }

    @Test
    void toString_ShouldReturnName() {
        assertEquals("PENDING", PredictionStatus.PENDING.toString());
        assertEquals("COMPLETED", PredictionStatus.COMPLETED.toString());
    }

    @Test
    void ordinal_ShouldReturnCorrectOrder() {
        assertEquals(0, PredictionStatus.PENDING.ordinal());
        assertEquals(1, PredictionStatus.COMPLETED.ordinal());
    }

    @Test
    void compareTo_ShouldFollowOrdinalOrder() {
        assertTrue(PredictionStatus.PENDING.compareTo(PredictionStatus.COMPLETED) < 0);
        assertTrue(PredictionStatus.COMPLETED.compareTo(PredictionStatus.PENDING) > 0);
        assertEquals(0, PredictionStatus.PENDING.compareTo(PredictionStatus.PENDING));
    }
}
