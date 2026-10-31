package dev.ulloasp.mlsuite.admin.purge;

import jakarta.annotation.Nullable;

/** A claimed purge: what its worker needs to run it. */
record PurgeJob(Long id, PurgeScope scope, Long targetId, String targetLabel, Long organizationId,
        @Nullable Long requestedBy, PurgePhase phase) {
}
