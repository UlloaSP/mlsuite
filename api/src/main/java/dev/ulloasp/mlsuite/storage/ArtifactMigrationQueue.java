package dev.ulloasp.mlsuite.storage;

import java.util.Optional;

public interface ArtifactMigrationQueue {

    Optional<ArtifactMigrationWorkItem> claim(int maxAttempts, long staleAfterSeconds, String leaseToken);

    boolean renew(Long id, String leaseToken);

    int retryFailed();
}
