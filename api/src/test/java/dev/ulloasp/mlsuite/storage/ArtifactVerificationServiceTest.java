package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;

class ArtifactVerificationServiceTest {

    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final ModelRepository models = mock(ModelRepository.class);
    private final ArtifactVerificationService service = new ArtifactVerificationService(storage, models);

    private static ModelArtifactReference artifact(long id) {
        return new ModelArtifactReference(id, "model.mlbundle", "bucket", "key-" + id, "version-" + id, 5L, "hash");
    }

    private void listed(ModelArtifactReference... artifacts) {
        when(models.findArtifactsAfter(0L, Limit.of(ArtifactVerificationService.PAGE)))
                .thenReturn(List.of(artifacts));
    }

    @Test
    void anArtifactMatchingItsRowPasses_readingItsExactVersion() {
        listed(artifact(1));
        when(storage.verify("bucket", "key-1", "version-1")).thenReturn(new StoredObjectVerification(5, "hash"));

        assertEquals(new ArtifactVerificationReport(1, 0), service.verify());
    }

    @Test
    void anotherHashOrSizeFails() {
        listed(artifact(1), artifact(2));
        when(storage.verify("bucket", "key-1", "version-1")).thenReturn(new StoredObjectVerification(5, "other"));
        when(storage.verify("bucket", "key-2", "version-2")).thenReturn(new StoredObjectVerification(6, "hash"));

        assertEquals(new ArtifactVerificationReport(2, 2), service.verify());
    }

    @Test
    void aMissingVersionFailsAndTheRestAreStillChecked() {
        listed(artifact(1), artifact(2));
        when(storage.verify("bucket", "key-1", "version-1")).thenThrow(new ObjectStorageException("gone", null));
        when(storage.verify("bucket", "key-2", "version-2")).thenReturn(new StoredObjectVerification(5, "hash"));

        assertEquals(new ArtifactVerificationReport(2, 1), service.verify());
    }

    @Test
    void everyPageIsChecked() {
        List<ModelArtifactReference> full = LongStream.rangeClosed(1, ArtifactVerificationService.PAGE)
                .mapToObj(ArtifactVerificationServiceTest::artifact).toList();
        long last = ArtifactVerificationService.PAGE;
        Limit limit = Limit.of(ArtifactVerificationService.PAGE);
        when(models.findArtifactsAfter(0L, limit)).thenReturn(full);
        when(models.findArtifactsAfter(last, limit)).thenReturn(List.of(artifact(last + 1)));
        when(storage.verify(eq("bucket"), anyString(), anyString())).thenReturn(new StoredObjectVerification(5, "hash"));

        assertEquals(new ArtifactVerificationReport(last + 1, 0), service.verify());
    }

    @Test
    void theJobFailsOnABadArtifactAndPassesOtherwise() {
        ArtifactOrphanReconciliationService reconciliation = mock(ArtifactOrphanReconciliationService.class);
        ArtifactVerificationService verification = mock(ArtifactVerificationService.class);
        ArtifactJobCommand job = new ArtifactJobCommand(reconciliation, verification, 60, "verify");

        when(verification.verify()).thenReturn(new ArtifactVerificationReport(2, 1));
        assertThrows(IllegalStateException.class, () -> job.run(null));

        when(verification.verify()).thenReturn(new ArtifactVerificationReport(2, 0));
        assertDoesNotThrow(() -> job.run(null));
        verifyNoInteractions(reconciliation);
    }

    @Test
    void theJobPrunesByDefaultAndRefusesAnythingElse() {
        ArtifactOrphanReconciliationService reconciliation = mock(ArtifactOrphanReconciliationService.class);
        ArtifactVerificationService verification = mock(ArtifactVerificationService.class);
        when(reconciliation.prune(anyLong())).thenReturn(new ArtifactOrphanReport(0, 0, 0));

        new ArtifactJobCommand(reconciliation, verification, 60, "prune").run(null);

        verify(reconciliation).prune(60);
        verifyNoInteractions(verification);
        assertThrows(IllegalArgumentException.class,
                () -> new ArtifactJobCommand(reconciliation, verification, 60, "delete-all").run(null));
    }
}
