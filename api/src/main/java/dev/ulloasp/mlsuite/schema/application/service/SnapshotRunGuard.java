package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

/** The one question every way of running a snapshot asks: is any of what it runs on being purged? */
@Component
@RequiredArgsConstructor
public class SnapshotRunGuard {

    private final JdbcTemplate jdbc;

    public boolean purging(Long schemaVersionId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT s.purging_at IS NOT NULL OR o.purging_at IS NOT NULL OR EXISTS (
                    SELECT 1 FROM schema_model_binding b JOIN model m ON m.id = b.model_id
                    WHERE b.schema_version_id = v.id AND m.purging_at IS NOT NULL)
                FROM schema_version v JOIN schema_artifact s ON s.id = v.schema_id
                JOIN organization o ON o.id = s.organization_id
                WHERE v.id = ?""", Boolean.class, schemaVersionId));
    }

    public void requireRunnable(Long schemaVersionId) {
        if (purging(schemaVersionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This schema or one of its models is being deleted");
        }
    }
}
