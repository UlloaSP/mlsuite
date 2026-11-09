package dev.ulloasp.mlsuite.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.SQLException;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

class ConstraintConflictsTest {

    @Test
    void aTakenNameIsAConflict() {
        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.CONFLICT, "This organization already has a model with this name."),
                ConstraintConflicts.of(refused("uq_model_name_org", "duplicate key value violates unique constraint")).orElseThrow());
    }

    @Test
    void aRefusedRunNamesTheRunWhoseNameIsTaken() {
        var refusal = refused("uq_prediction_run_version_name",
                "ERROR: duplicate key value\n  Detail: Key (schema_version_id, name)=(7, nightly, batch) already exists.");

        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.CONFLICT, "Prediction run name already exists: nightly, batch"),
                ConstraintConflicts.of(refusal).orElseThrow());
    }

    @Test
    void aParentStillReferencedIsInUse() {
        var refusal = refused("fk_schema_review_version",
                "update or delete on table \"schema_version\" violates foreign key constraint");

        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.CONFLICT,
                "A review is built on this snapshot; delete the review first."), ConstraintConflicts.of(refusal).orElseThrow());
    }

    @Test
    void aPluginASnapshotRendersWithAndATargetBeingPurgedAreConflicts() {
        var pinned = refused("fk_schema_version_plugin_plugin",
                "update or delete on table \"plugin_metadata\" violates foreign key constraint");
        var purging = refused("ck_schema_bookmark_not_purging", "The schema is being deleted");

        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.CONFLICT,
                "Published snapshots render with this plugin, so it stays while they do."),
                ConstraintConflicts.of(pinned).orElseThrow());
        assertEquals(HttpStatus.CONFLICT, ConstraintConflicts.of(purging).orElseThrow().status());
    }

    @Test
    void aSchemaWhoseSnapshotsHaveResultsIsKeptWithItsOwnMessage() {
        var refusal = refused("fk_prediction_result_binding",
                "update or delete on table \"schema_model_binding\" violates foreign key constraint");

        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.CONFLICT,
                "Prediction runs were made on this schema, so it stays while they do. Archive it instead."),
                ConstraintConflicts.of(refusal).orElseThrow());
    }

    @Test
    void aRowPointingOutsideItsSchemaIsABadRequest() {
        var refusal = refused("fk_schema_review_version",
                "insert or update on table \"schema_review\" violates foreign key constraint");

        assertEquals(new ConstraintConflicts.Conflict(HttpStatus.BAD_REQUEST, "Schema snapshot unavailable"),
                ConstraintConflicts.of(refusal).orElseThrow());
    }

    @Test
    void anUnknownConstraintIsLeftToTheGenericAnswer() {
        assertTrue(ConstraintConflicts.of(refused("ck_model_preparation_lease", "violates check constraint")).isEmpty());
        assertTrue(ConstraintConflicts.of(new DataIntegrityViolationException("no constraint named")).isEmpty());
    }

    private static DataIntegrityViolationException refused(String constraint, String message) {
        return new DataIntegrityViolationException("refused",
                new ConstraintViolationException("refused", new SQLException(message), constraint));
    }
}
