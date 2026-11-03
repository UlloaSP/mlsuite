package dev.ulloasp.mlsuite.audit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

class AuditDetailsTest {

    @Test
    void keepsValuesInOrderAndDropsTheOnesLeftNull() {
        assertEquals(List.of("name", "count"),
                List.copyOf(AuditDetails.of("name", "Acme", "missing", null, "count", 3).keySet()));
    }

    @Test
    void aChangeHoldsBothValuesAndAnUnchangedOneIsLeftOut() {
        assertEquals(Map.of("name", Map.of("from", "old", "to", "new")),
                AuditDetails.of("name", AuditDetails.changed("old", "new")));
        assertNull(AuditDetails.changed("same", "same"));
        assertEquals(Map.of(), AuditDetails.of("name", AuditDetails.changed("same", "same")));
        assertEquals(Map.of("to", "first"), AuditDetails.changed(null, "first"));
    }

    @Test
    void longTextIsCutSoAnEntryStaysSmall() {
        String kept = (String) AuditDetails.of("note", "x".repeat(10_000)).get("note");

        assertEquals(500, kept.length());
        assertEquals('…', kept.charAt(499));
    }

    @Test
    void numbersAndFlagsKeepTheirType() {
        assertEquals(Map.of("rows", 3L, "personal", true), AuditDetails.of("rows", 3L, "personal", true));
    }

    @Test
    void aKeyWithoutItsValueIsAProgrammingError() {
        assertThrows(IllegalArgumentException.class, () -> AuditDetails.of("alone"));
    }
}
