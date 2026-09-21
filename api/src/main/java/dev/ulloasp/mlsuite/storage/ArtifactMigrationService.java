package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionTemplate;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;

public class ArtifactMigrationService {

    private static final Logger log = LoggerFactory.getLogger(ArtifactMigrationService.class);
    private final ModelRepository models;
    private final ObjectStorageService objectStorage;
    private final ModelArtifactWriter writer;
    private final ArtifactMigrationClaimRepository claims;
    private final TransactionTemplate transactions;
    private final StorageDeletionQueue deletionQueue;

    public ArtifactMigrationService(
            ModelRepository models,
            ObjectStorageService objectStorage,
            ModelArtifactWriter writer,
            ArtifactMigrationClaimRepository claims,
            TransactionTemplate transactions,
            StorageDeletionQueue deletionQueue) {
        this.models = models;
        this.objectStorage = objectStorage;
        this.writer = writer;
        this.claims = claims;
        this.transactions = transactions;
        this.deletionQueue = deletionQueue;
    }

    public ArtifactMigrationReport migrate(ArtifactMigrationProperties properties) {
        String workerId = properties.effectiveWorkerId();
        long examined = 0;
        long verified = 0;
        long failed = 0;
        List<Long> ids;
        do {
            ids = claims.claim(
                    properties.getBatchSize(),
                    properties.getMaxAttempts(),
                    properties.getStaleAfterSeconds(),
                    workerId);
            for (Long id : ids) {
                examined++;
                if (migrateOne(id)) {
                    verified++;
                } else {
                    failed++;
                }
            }
        } while (!ids.isEmpty());
        return new ArtifactMigrationReport(examined, verified, failed);
    }

    public ArtifactMigrationReport verifyAll() {
        long examined = 0;
        long verified = 0;
        long failed = 0;
        for (Model model : models.findByStorageObjectKeyIsNotNullOrderByIdAsc()) {
            examined++;
            try {
                byte[] bytes = objectStorage.load(model.getStorageBucket(), model.getStorageObjectKey());
                verifyBytes(model, bytes);
                verified++;
            } catch (RuntimeException ex) {
                failed++;
                log.warn("Artifact verification failed for model {}: {}", model.getId(), ex.getMessage());
            }
        }
        return new ArtifactMigrationReport(examined, verified, failed);
    }

    public int retryFailed() {
        return claims.retryFailed();
    }

    private boolean migrateOne(Long id) {
        try {
            Model model = models.findById(id).orElseThrow();
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
                model.setArtifactState(ModelArtifactState.VERIFIED);
                model.setArtifactVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
                model.setArtifactMigrationStartedAt(null);
                model.setArtifactMigrationWorker(null);
                model.setArtifactMigrationError(null);
                models.save(model);
                if (previousKey != null && !previousKey.equals(model.getStorageObjectKey())) {
                    deletionQueue.enqueue(previousBucket, previousKey, previousVersion);
                }
            });
            return true;
        } catch (RuntimeException ex) {
            transactions.executeWithoutResult(status -> models.findById(id).ifPresent(model -> {
                model.setArtifactState(ModelArtifactState.FAILED);
                model.setArtifactMigrationStartedAt(null);
                model.setArtifactMigrationWorker(null);
                model.setArtifactMigrationError(truncate(ex.getMessage()));
                models.save(model);
            }));
            return false;
        }
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

    private void verifyBytes(Model model, byte[] bytes) {
        if (model.getModelSizeBytes() == null || model.getModelSizeBytes() != bytes.length) {
            throw new ArtifactIntegrityException("Size mismatch for model " + model.getId());
        }
        if (model.getArtifactSha256() == null
                || !model.getArtifactSha256().equals(ArtifactHash.sha256(bytes))) {
            throw new ArtifactIntegrityException("SHA-256 mismatch for model " + model.getId());
        }
    }

    private String truncate(String message) {
        String value = message == null ? "Unknown migration failure" : message;
        return value.substring(0, Math.min(value.length(), 1000));
    }
}
