/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
                new PredictionStatus[] { PredictionStatus.PENDING, PredictionStatus.SUCCESS,
                        PredictionStatus.FAILED },
                statuses);
    }

    @Test
    void valueOf_ValidName_ShouldReturnCorrectEnum() {
        // When & Then
        assertEquals(PredictionStatus.PENDING, PredictionStatus.valueOf("PENDING"));
        assertEquals(PredictionStatus.SUCCESS, PredictionStatus.valueOf("SUCCESS"));
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
        assertEquals("SUCCESS", PredictionStatus.SUCCESS.name());
        assertEquals("FAILED", PredictionStatus.FAILED.name());
    }

    @Test
    void toString_ShouldReturnName() {
        // When & Then
        assertEquals("PENDING", PredictionStatus.PENDING.toString());
        assertEquals("SUCCESS", PredictionStatus.SUCCESS.toString());
        assertEquals("FAILED", PredictionStatus.FAILED.toString());
    }

    @Test
    void ordinal_ShouldReturnCorrectOrder() {
        // When & Then
        assertEquals(0, PredictionStatus.PENDING.ordinal());
        assertEquals(1, PredictionStatus.SUCCESS.ordinal());
        assertEquals(2, PredictionStatus.FAILED.ordinal());
    }

    @Test
    void compareTo_ShouldFollowOrdinalOrder() {
        // When & Then
        assertTrue(PredictionStatus.PENDING.compareTo(PredictionStatus.SUCCESS) < 0);
        assertTrue(PredictionStatus.SUCCESS.compareTo(PredictionStatus.FAILED) < 0);
        assertTrue(PredictionStatus.FAILED.compareTo(PredictionStatus.PENDING) > 0);
        assertEquals(0, PredictionStatus.PENDING.compareTo(PredictionStatus.PENDING));
    }
}
