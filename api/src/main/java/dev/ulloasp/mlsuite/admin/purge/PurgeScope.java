package dev.ulloasp.mlsuite.admin.purge;

/** What a purge destroys. A personal account is only purged through its user. */
public enum PurgeScope {
    ORGANIZATION,
    USER,
    SCHEMA,
    MODEL;

    /** Whether the job ends by deleting a whole organization: the team, or the user's personal account. */
    boolean ownsOrganization() {
        return this == ORGANIZATION || this == USER;
    }

    /** The snapshots it destroys, as one column {@code id} of a query on :organization and :target. */
    String versions() {
        return switch (this) {
            case ORGANIZATION, USER -> """
                    SELECT v.id FROM schema_version v JOIN schema_artifact s ON s.id = v.schema_id
                    WHERE s.organization_id = :organization""";
            case SCHEMA -> "SELECT id FROM schema_version WHERE schema_id = :target";
            // A snapshot cannot run without every model it binds, so each one binding this model goes with it.
            case MODEL -> """
                    SELECT schema_version_id AS id FROM schema_model_binding WHERE model_id = :target
                    UNION SELECT r.schema_version_id FROM prediction_result x
                    JOIN prediction_run r ON r.id = x.prediction_run_id WHERE x.model_id = :target""";
        };
    }
}
