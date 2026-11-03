package dev.ulloasp.mlsuite.storage;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

class StorageDeletionProcessorTest {

    private final StorageDeletionWorkQueue queue = mock(StorageDeletionWorkQueue.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final AuditLogService auditLog = mock(AuditLogService.class);
    private final StorageDeletionProcessor processor = new StorageDeletionProcessor(queue, storage, auditLog, 5, 20, 300, 30000);

    @Test
    void completesAClaimOnlyAfterObjectDeletionSucceeds() {
        StorageDeletionWorkItem item = new StorageDeletionWorkItem(7L, 41L, "models", "immutable/key", "version-1");
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(item));

        processor.processPending();

        verify(storage).delete("models", "immutable/key", "version-1");
        verify(queue).complete(org.mockito.ArgumentMatchers.eq(7L), anyString());
    }

    /** A bulk job holds the thread fixed-delay scheduled tasks share, and deletions must go on meanwhile. */
    @Test
    void deletionsRunOnAThreadOfTheirOwn() {
        StorageDeletionProcessor running = new StorageDeletionProcessor(queue, storage, auditLog, 5, 20, 300, 5);
        var thread = new java.util.concurrent.CompletableFuture<String>();
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenAnswer(call -> {
                    thread.complete(Thread.currentThread().getName());
                    return List.of();
                });

        running.start();
        try {
            org.junit.jupiter.api.Assertions.assertEquals("storage-deletion", thread.orTimeout(5, java.util.concurrent.TimeUnit.SECONDS).join());
        } finally {
            running.stop();
        }
    }

    @Test
    void aTaskWithoutAVersionRemovesEveryVersionOfItsKey() {
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(new StorageDeletionWorkItem(8L, 41L, "models", "plugin/key", null)));

        processor.processPending();

        verify(storage).deleteAllVersions("models", "plugin/key");
        verify(queue).complete(org.mockito.ArgumentMatchers.eq(8L), anyString());
    }

    @Test
    void releasesAClaimForRetryWhenObjectDeletionFails() {
        StorageDeletionWorkItem item = new StorageDeletionWorkItem(9L, 41L, "models", "immutable/key", "version-1");
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(item));
        org.mockito.Mockito.doThrow(new ObjectStorageException("storage unavailable"))
                .when(storage).delete("models", "immutable/key", "version-1");

        processor.processPending();

        verify(queue).fail(org.mockito.ArgumentMatchers.eq(9L), anyString(),
                org.mockito.ArgumentMatchers.eq("storage unavailable"), org.mockito.ArgumentMatchers.eq(5));
        org.mockito.Mockito.verifyNoInteractions(auditLog);
    }

    @Test
    void aDeletionFailingForGoodIsRecordedForItsOrganization() {
        StorageDeletionWorkItem item = new StorageDeletionWorkItem(9L, 41L, "models", "immutable/key", "version-1");
        when(queue.claim(org.mockito.ArgumentMatchers.eq(20), org.mockito.ArgumentMatchers.eq(300L), anyString()))
                .thenReturn(List.of(item));
        org.mockito.Mockito.doThrow(new ObjectStorageException("storage unavailable"))
                .when(storage).delete("models", "immutable/key", "version-1");
        when(queue.fail(org.mockito.ArgumentMatchers.eq(9L), anyString(), anyString(), org.mockito.ArgumentMatchers.eq(5)))
                .thenReturn(true);

        processor.processPending();

        verify(auditLog).record(AuditActor.SYSTEM, 41L, AuditAction.STORAGE_DELETION_FAILED, 9L, AuditDetails.of(
                "bucket", "models", "objectKey", "immutable/key", "attempts", 5, "reason", "storage unavailable"));
    }
}
