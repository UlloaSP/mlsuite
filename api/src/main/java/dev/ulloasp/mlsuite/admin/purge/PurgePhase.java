package dev.ulloasp.mlsuite.admin.purge;

import java.util.Arrays;
import java.util.List;

/** The steps of a purge, children before parents: most foreign keys take no action on delete. */
public enum PurgePhase {
    PREPARE,
    JOBS,
    FEEDBACK,
    REVIEWS,
    RESULTS,
    RUNS,
    SCHEMA_CONTENT,
    VERSIONS,
    MODELS,
    PLUGINS,
    MEMBERS,
    ACCOUNT,
    FINISH;

    PurgePhase next() {
        return values()[ordinal() + 1];
    }

    List<PurgePhase> fromHere() {
        return Arrays.stream(values()).filter(phase -> phase.ordinal() >= ordinal()).toList();
    }
}
