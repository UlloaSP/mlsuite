package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;

class ArtifactMigrationServiceTest {

    private final ModelRepository models = mock(ModelRepository.class);
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final ModelArtifactWriter writer = mock(ModelArtifactWriter.class);
    private final ArtifactMigrationQueue queue = mock(ArtifactMigrationQueue.class);
    private final TransactionTemplate transactions = mock(TransactionTemplate.class);
    private final StorageDeletionQueue deletionQueue = mock(StorageDeletionQueue.class);
    private final ArtifactMigrationProperties properties = new ArtifactMigrationProperties();
    private ArtifactMigrationService service;

    @BeforeEach
    void setUp() {
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            Consumer<TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(mock(TransactionStatus.class));
            return null;
        }).when(transactions).executeWithoutResult(any());
        service = new ArtifactMigrationService(models, storage, writer, queue, transactions, deletionQueue);
    }

    @Test
    void migrationClaimsFiniteBatchesAndMarksVerified() {
        Model model = inlineModel();
        when(queue.claim(anyInt(), anyInt(), anyLong(), anyString()))
                .thenReturn(List.of(new ArtifactMigrationWorkItem(7L, "test-worker")), List.of());
        when(models.findById(7L)).thenReturn(Optional.of(model));

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.verified());
        assertEquals(ModelArtifactState.VERIFIED, model.getArtifactState());
    }

    @Test
    void migrationPersistsFailureAndContinuesInsteadOfLoopingOnPoisonRow() {
        Model model = inlineModel();
        when(queue.claim(anyInt(), anyInt(), anyLong(), anyString()))
                .thenReturn(List.of(new ArtifactMigrationWorkItem(7L, "test-worker")), List.of());
        when(models.findById(7L)).thenReturn(Optional.of(model));
        org.mockito.Mockito.doThrow(new ObjectStorageException("down"))
                .when(writer).storeAndAttach(any(), any(), any());

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.failed());
        assertEquals(ModelArtifactState.FAILED, model.getArtifactState());
        assertEquals("down", model.getArtifactMigrationError());
    }

    @Test
    void staleWorkerCannotCompleteOrFailAReclaimedMigration() {
        Model model = inlineModel();
        model.setArtifactMigrationWorker("new-worker");
        when(queue.claim(anyInt(), anyInt(), anyLong(), anyString()))
                .thenReturn(List.of(new ArtifactMigrationWorkItem(7L, "test-worker")), List.of());
        when(models.findById(7L)).thenReturn(Optional.of(model));

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.examined());
        assertEquals(0, report.verified());
        assertEquals(0, report.failed());
        assertEquals(ModelArtifactState.RUNNING, model.getArtifactState());
        assertEquals("new-worker", model.getArtifactMigrationWorker());
    }

    @Test
    void verificationPagesLightweightReferencesAndStreamsEachObject() {
        StoredArtifactReference reference = new StoredArtifactReference(7L, "models", "key", 5L, "hash");
        when(models.findStoredArtifactReferences(PageRequest.of(0, 100)))
                .thenReturn(new SliceImpl<>(List.of(reference)));
        when(storage.verify("models", "key")).thenReturn(new StoredObjectVerification(5L, "hash"));

        ArtifactMigrationReport report = service.verifyAll();

        assertEquals(1, report.examined());
        assertEquals(1, report.verified());
        assertEquals(0, report.failed());
    }

    private Model inlineModel() {
        Model model = new Model();
        model.setId(7L);
        model.setModelFile("model".getBytes());
        model.setArtifactState(ModelArtifactState.RUNNING);
        model.setArtifactMigrationWorker("test-worker");
        return model;
    }
}
