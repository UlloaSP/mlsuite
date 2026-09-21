package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;

public class ArtifactMigrationService {

    private static final Logger log = LoggerFactory.getLogger(ArtifactMigrationService.class);
    private final ModelRepository models;
    private final ObjectStorageService objectStorage;
    private final ModelArtifactWriter writer;
    private final ArtifactMigrationQueue queue;
    private final TransactionTemplate transactions;
    private final StorageDeletionQueue deletionQueue;

    public ArtifactMigrationService(
            ModelRepository models,
            ObjectStorageService objectStorage,
            ModelArtifactWriter writer,
            ArtifactMigrationQueue queue,
            TransactionTemplate transactions,
            StorageDeletionQueue deletionQueue) {
        this.models = models;
        this.objectStorage = objectStorage;
        this.writer = writer;
        this.queue = queue;
        this.transactions = transactions;
        this.deletionQueue = deletionQueue;
    }

    public ArtifactMigrationReport migrate(ArtifactMigrationProperties properties) {
        long examined = 0;
        long verified = 0;
        long failed = 0;
        List<ArtifactMigrationWorkItem> items;
        do {
            String leaseToken = UUID.randomUUID().toString();
            items = queue.claim(
                    properties.getBatchSize(),
                    properties.getMaxAttempts(),
                    properties.getStaleAfterSeconds(),
                    leaseToken);
            for (ArtifactMigrationWorkItem item : items) {
                examined++;
                MigrationOutcome outcome = migrateOne(item.id(), item.leaseToken());
                if (outcome == MigrationOutcome.VERIFIED) {
                    verified++;
                } else if (outcome == MigrationOutcome.FAILED) {
                    failed++;
                }
            }
        } while (!items.isEmpty());
        return new ArtifactMigrationReport(examined, verified, failed);
    }

    public ArtifactMigrationReport verifyAll() {
        long examined = 0;
        long verified = 0;
        long failed = 0;
        int page = 0;
        boolean hasNext;
        do {
            var references = models.findStoredArtifactReferences(PageRequest.of(page++, 100));
            for (StoredArtifactReference reference : references) {
                examined++;
                try {
                    StoredObjectVerification actual = objectStorage.verify(reference.bucket(), reference.objectKey());
                    verifyStoredReference(reference, actual);
                    verified++;
                } catch (RuntimeException ex) {
                    failed++;
                    log.warn("Artifact verification failed for model {}: {}", reference.id(), ex.getMessage());
                }
            }
            hasNext = references.hasNext();
        } while (hasNext);
        return new ArtifactMigrationReport(examined, verified, failed);
    }

    public int retryFailed() {
        return queue.retryFailed();
    }

    private MigrationOutcome migrateOne(Long id, String workerId) {
        try {
            Model model = models.findById(id).orElseThrow();
            if (!ownsClaim(model, workerId)) {
                return MigrationOutcome.LOST;
            }
            byte[] bytes = model.getModelFile();
            String previousBucket = model.getStorageBucket();
            String previousKey = model.getStorageObjectKey();
            String previousVersion = model.getStorageVersionId();
            if (bytes != null && bytes.length > 0) {
                String sha256 = ArtifactHash.sha256(bytes);
                if (!verifyExisting(model, bytes, sha256)) {
                    writer.storeAndAttach(model, bytes, "application/octet-stream");
                }
            } else if (model.hasStoredObject()) {
                verifyStoredOnly(model);
            } else {
                throw new ArtifactIntegrityException("Model has neither inline nor stored artifact bytes");
            }
            transactions.executeWithoutResult(status -> {
                Model claimed = models.findById(id).orElseThrow();
                if (!ownsClaim(claimed, workerId)) {
                    throw new LostArtifactMigrationClaimException(id);
                }
                copyArtifactResult(model, claimed);
                models.save(claimed);
                if (previousKey != null && !previousKey.equals(model.getStorageObjectKey())) {
                    deletionQueue.enqueue(previousBucket, previousKey, previousVersion);
                }
            });
            return MigrationOutcome.VERIFIED;
        } catch (LostArtifactMigrationClaimException ex) {
            return MigrationOutcome.LOST;
        } catch (RuntimeException ex) {
            return markFailedIfOwned(id, workerId, ex);
        }
    }

    private MigrationOutcome markFailedIfOwned(Long id, String workerId, RuntimeException failure) {
        try {
            transactions.executeWithoutResult(status -> models.findById(id).ifPresent(model -> {
                if (!ownsClaim(model, workerId)) {
                    return;
                }
                model.setArtifactState(ModelArtifactState.FAILED);
                model.setArtifactMigrationStartedAt(null);
                model.setArtifactMigrationWorker(null);
                model.setArtifactMigrationError(truncate(failure.getMessage()));
                models.save(model);
            }));
            Model current = models.findById(id).orElse(null);
            return current != null && current.getArtifactState() == ModelArtifactState.FAILED
                    ? MigrationOutcome.FAILED
                    : MigrationOutcome.LOST;
        } catch (RuntimeException concurrentUpdate) {
            return MigrationOutcome.LOST;
        }
    }

    private boolean ownsClaim(Model model, String workerId) {
        return model.getArtifactState() == ModelArtifactState.RUNNING
                && workerId.equals(model.getArtifactMigrationWorker());
    }

    private void copyArtifactResult(Model source, Model target) {
        target.setStorageBucket(source.getStorageBucket());
        target.setStorageObjectKey(source.getStorageObjectKey());
        target.setStorageEtag(source.getStorageEtag());
        target.setStorageVersionId(source.getStorageVersionId());
        target.setModelSizeBytes(source.getModelSizeBytes());
        target.setArtifactSha256(source.getArtifactSha256());
        target.setModelFile(source.getModelFile());
        target.setArtifactState(ModelArtifactState.VERIFIED);
        target.setArtifactVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
        target.setArtifactMigrationStartedAt(null);
        target.setArtifactMigrationWorker(null);
        target.setArtifactMigrationError(null);
    }

    private void verifyStoredOnly(Model model) {
        byte[] stored = objectStorage.load(model.getStorageBucket(), model.getStorageObjectKey());
        StoredObjectMetadata metadata = objectStorage
                .inspectOptional(model.getStorageBucket(), model.getStorageObjectKey())
                .orElseThrow(() -> new ArtifactIntegrityException("Stored object is missing"));
        model.setArtifactSha256(ArtifactHash.sha256(stored));
        model.setModelSizeBytes((long) stored.length);
        model.setStorageEtag(metadata.etag());
        model.setStorageVersionId(metadata.versionId());
    }

    private boolean verifyExisting(Model model, byte[] source, String sha256) {
        if (!model.hasStoredObject()) {
            return false;
        }
        try {
            byte[] stored = objectStorage.load(model.getStorageBucket(), model.getStorageObjectKey());
            if (stored.length != source.length || !sha256.equals(ArtifactHash.sha256(stored))) {
                return false;
            }
            StoredObjectMetadata metadata = objectStorage
                    .inspectOptional(model.getStorageBucket(), model.getStorageObjectKey())
                    .orElseThrow();
            model.setArtifactSha256(sha256);
            model.setModelSizeBytes((long) stored.length);
            model.setStorageEtag(metadata.etag());
            model.setStorageVersionId(metadata.versionId());
            return true;
        } catch (ObjectStorageException ex) {
            return false;
        }
    }

    private void verifyStoredReference(StoredArtifactReference expected, StoredObjectVerification actual) {
        if (expected.sizeBytes() == null || expected.sizeBytes() != actual.sizeBytes()) {
            throw new ArtifactIntegrityException("Size mismatch for model " + expected.id());
        }
        if (expected.sha256() == null || !expected.sha256().equals(actual.sha256())) {
            throw new ArtifactIntegrityException("SHA-256 mismatch for model " + expected.id());
        }
    }

    private String truncate(String message) {
        String value = message == null ? "Unknown migration failure" : message;
        return value.substring(0, Math.min(value.length(), 1000));
    }

    private enum MigrationOutcome {
        VERIFIED,
        FAILED,
        LOST
    }
}
