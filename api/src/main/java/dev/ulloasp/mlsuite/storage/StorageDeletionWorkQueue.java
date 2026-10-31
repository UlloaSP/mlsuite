package dev.ulloasp.mlsuite.storage;

import java.util.List;

public interface StorageDeletionWorkQueue {

    List<StorageDeletionWorkItem> claim(int batchSize, long staleAfterSeconds, String claimToken);

    void complete(Long id, String claimToken);

    /** Counts a failed attempt; true when it was the last the task gets. */
    boolean fail(Long id, String claimToken, String error, int maxAttempts);
}
