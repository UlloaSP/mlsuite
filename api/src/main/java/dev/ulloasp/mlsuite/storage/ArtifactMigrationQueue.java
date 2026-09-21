package dev.ulloasp.mlsuite.storage;

import java.util.List;

public interface ArtifactMigrationQueue {

    List<ArtifactMigrationWorkItem> claim(int batchSize, int maxAttempts, long staleAfterSeconds, String leaseToken);

    int retryFailed();
}
