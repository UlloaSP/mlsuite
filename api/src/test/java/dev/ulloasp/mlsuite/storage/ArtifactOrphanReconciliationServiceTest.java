package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
class ArtifactOrphanReconciliationServiceTest {

    @Test
    void deletesOnlyTheExactVersionOfOldUnreferencedManagedObjects() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelRepository models = mock(ModelRepository.class);
        String orphan = "organizations/41/models/7/artifacts/hash/model.joblib";
        String referenced = "organizations/41/models/8/artifacts/hash/model.joblib";
        OffsetDateTime old = OffsetDateTime.now(ZoneOffset.UTC).minusDays(2);
        when(storage.list("organizations/")).thenReturn(List.of(
                new StoredObjectItem("bucket", orphan, 5, "etag", old),
                new StoredObjectItem("bucket", referenced, 5, "etag", old)));
        when(storage.inspectOptional("bucket", orphan)).thenReturn(Optional.of(
                new StoredObjectMetadata("bucket", orphan, 5, "etag", "orphan-v1", "hash")));
        when(models.existsByStorageBucketAndStorageObjectKey("bucket", referenced)).thenReturn(true);

        ArtifactOrphanReport report = new ArtifactOrphanReconciliationService(storage, models)
                .prune(86400);

        assertEquals(2, report.examined());
        assertEquals(1, report.deleted());
        assertEquals(0, report.failed());
        verify(storage).delete("bucket", orphan, "orphan-v1");
        verify(storage, never()).inspectOptional("bucket", referenced);
    }
}
