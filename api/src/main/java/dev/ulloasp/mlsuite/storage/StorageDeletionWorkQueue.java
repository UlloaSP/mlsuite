package dev.ulloasp.mlsuite.storage;

import java.util.List;

public interface StorageDeletionWorkQueue {

    List<StorageDeletionWorkItem> claim(int batchSize, long staleAfterSeconds, String claimToken);

    void complete(Long id, String claimToken);

    void fail(Long id, String claimToken, String error, int maxAttempts);
}
