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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
        when(models.findById(7L)).thenReturn(Optional.of(model));

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.verified());
        assertEquals(ModelArtifactState.VERIFIED, model.getArtifactState());
    }

    @Test
    void migrationReusesACompleteUploadLeftByAnInterruptedAttempt() {
        Model model = inlineModel();
        Model claimed = inlineModel();
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
        when(models.findById(7L)).thenReturn(Optional.of(model), Optional.of(claimed));
        when(writer.attachExisting(model, model.getModelFile())).thenAnswer(invocation -> {
            model.setStorageBucket("models");
            model.setStorageObjectKey("content-addressed-key");
            model.setArtifactState(ModelArtifactState.VERIFIED);
            return true;
        });

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.verified());
        assertEquals(ModelArtifactState.VERIFIED, claimed.getArtifactState());
        org.mockito.Mockito.verify(writer, org.mockito.Mockito.never())
                .storeAndAttach(any(), any(), any());
    }

    @Test
    void migrationRewritesAStoredOnlyLegacyObjectToObtainAnExactVersion() {
        Model model = inlineModel();
        model.setModelFile(new byte[0]);
        model.setStorageBucket("models");
        model.setStorageObjectKey("legacy-key");
        Model claimed = inlineModel();
        claimed.setModelFile(new byte[0]);
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
        when(models.findById(7L)).thenReturn(Optional.of(model), Optional.of(claimed));
        when(storage.inspectOptional("models", "legacy-key", null)).thenReturn(Optional.of(
                new StoredObjectMetadata("models", "legacy-key", 5, "etag", null, null)));
        when(storage.load("models", "legacy-key", null)).thenReturn("model".getBytes());
        when(writer.storeAndAttach(
                org.mockito.Mockito.eq(model), any(byte[].class),
                org.mockito.Mockito.eq("application/octet-stream")))
                .thenAnswer(invocation -> {
                    model.setStorageBucket("models");
                    model.setStorageObjectKey("versioned-key");
                    model.setStorageVersionId("version-1");
                    model.setArtifactSha256(ArtifactHash.sha256("model".getBytes()));
                    model.setModelSizeBytes(5L);
                    return new StoredObject(
                            "models", "versioned-key", 5, "etag", "version-1",
                            ArtifactHash.sha256("model".getBytes()));
                });

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.verified());
        assertEquals("version-1", claimed.getStorageVersionId());
        org.mockito.Mockito.verify(writer)
                .storeAndAttach(
                        org.mockito.Mockito.eq(model), any(byte[].class),
                        org.mockito.Mockito.eq("application/octet-stream"));
    }

    @Test
    void migrationPersistsFailureAndContinuesInsteadOfLoopingOnPoisonRow() {
        Model model = inlineModel();
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
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
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
        when(models.findById(7L)).thenReturn(Optional.of(model));

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(1, report.examined());
        assertEquals(0, report.verified());
        assertEquals(0, report.failed());
        assertEquals(ModelArtifactState.RUNNING, model.getArtifactState());
        assertEquals("new-worker", model.getArtifactMigrationWorker());
    }

    @Test
    void lostLeaseLeavesTheDeterministicUploadForTheNewOwner() throws Exception {
        Model model = inlineModel();
        CountDownLatch heartbeat = new CountDownLatch(1);
        properties.setStaleAfterSeconds(1);
        when(queue.claim(anyInt(), anyLong(), anyString()))
                .thenReturn(Optional.of(new ArtifactMigrationWorkItem(7L, "test-worker")), Optional.empty());
        when(queue.renew(7L, "test-worker")).thenAnswer(invocation -> {
            model.setArtifactMigrationWorker("new-worker");
            heartbeat.countDown();
            return false;
        });
        when(models.findById(7L)).thenReturn(Optional.of(model));
        when(writer.storeAndAttach(any(), any(), any())).thenAnswer(invocation -> {
            if (!heartbeat.await(3, TimeUnit.SECONDS)) {
                throw new AssertionError("lease heartbeat did not run");
            }
            model.setStorageBucket("models");
            model.setStorageObjectKey("key");
            model.setStorageVersionId("version-2");
            return new StoredObject("models", "key", 5, "etag", "version-2", "sha");
        });

        ArtifactMigrationReport report = service.migrate(properties);

        assertEquals(0, report.verified());
        org.mockito.Mockito.verify(storage, org.mockito.Mockito.never())
                .delete("models", "key", "version-2");
    }

    @Test
    void verificationPagesLightweightReferencesAndStreamsEachObject() {
        StoredArtifactReference reference = new StoredArtifactReference(
                7L, "models", "key", "version-7", 5L, "hash");
        when(models.findStoredArtifactReferences(PageRequest.of(0, 100)))
                .thenReturn(new SliceImpl<>(List.of(reference)));
        when(storage.verify("models", "key", "version-7"))
                .thenReturn(new StoredObjectVerification(5L, "hash"));

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
