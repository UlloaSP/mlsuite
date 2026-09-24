package dev.ulloasp.mlsuite.storage;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

import java.util.List;

import org.junit.jupiter.api.Test;

class StorageDeletionProcessorTest {

    private final StorageDeletionWorkQueue queue = mock(StorageDeletionWorkQueue.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final StorageDeletionProcessor processor = new StorageDeletionProcessor(queue, storage, 5, 20, 300);

    @Test
    void completesAClaimOnlyAfterObjectDeletionSucceeds() {
        StorageDeletionWorkItem item = new StorageDeletionWorkItem(7L, "models", "immutable/key");
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(item));

        processor.processPending();

        verify(storage).delete("models", "immutable/key");
        verify(queue).complete(org.mockito.ArgumentMatchers.eq(7L), anyString());
    }

    @Test
    void releasesAClaimForRetryWhenObjectDeletionFails() {
        StorageDeletionWorkItem item = new StorageDeletionWorkItem(9L, "models", "immutable/key");
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(item));
        org.mockito.Mockito.doThrow(new ObjectStorageException("storage unavailable"))
                .when(storage).delete("models", "immutable/key");

        processor.processPending();

        verify(queue).fail(org.mockito.ArgumentMatchers.eq(9L), anyString(),
                org.mockito.ArgumentMatchers.eq("storage unavailable"), org.mockito.ArgumentMatchers.eq(5));
    }
}
