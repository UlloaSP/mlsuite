package dev.ulloasp.mlsuite.storage;

import java.util.List;

public interface ArtifactMigrationQueue {

    List<Long> claim(int batchSize, int maxAttempts, long staleAfterSeconds, String workerId);

    int retryFailed();
}
