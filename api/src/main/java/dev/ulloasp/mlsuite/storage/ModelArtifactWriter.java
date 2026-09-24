package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;

@Service
public class ModelArtifactWriter {

    private final ObjectStorageService objectStorageService;
    private final StorageProperties properties;

    public ModelArtifactWriter(ObjectStorageService objectStorageService, StorageProperties properties) {
        this.objectStorageService = objectStorageService;
        this.properties = properties;
    }

    public StoredObject storeAndAttach(Model model, byte[] bytes, String contentType) {
        requirePersisted(model);
        String sha256 = ArtifactHash.sha256(bytes);
        String objectKey = objectKey(model, sha256);
        StoredObject stored = objectStorageService.store(objectKey, model.getFileName(), contentType, bytes);
        try {
            ArtifactIntegrityVerifier.verifyRequired(
                    "model " + model.getId(), (long) bytes.length, sha256,
                    objectStorageService.verify(stored.bucket(), stored.objectKey(), stored.versionId()));
        } catch (RuntimeException failure) {
            deleteExactVersion(stored, failure);
            throw failure;
        }

        attach(model, stored.bucket(), stored.objectKey(), stored.etag(), stored.versionId(), stored.sizeBytes(), sha256);
        return stored;
    }

    public boolean attachExisting(Model model, byte[] bytes) {
        requirePersisted(model);
        String sha256 = ArtifactHash.sha256(bytes);
        String objectKey = objectKey(model, sha256);
        var existing = objectStorageService.inspectOptional(properties.getBucket(), objectKey);
        if (existing.isEmpty()) {
            return false;
        }
        StoredObjectMetadata metadata = existing.get();
        if (metadata.versionId() == null || metadata.versionId().isBlank()) {
            return false;
        }
        try {
            ArtifactIntegrityVerifier.verifyRequired(
                    "model " + model.getId(), (long) bytes.length, sha256,
                    objectStorageService.verify(metadata.bucket(), metadata.objectKey(), metadata.versionId()));
        } catch (ArtifactIntegrityException mismatch) {
            return false;
        }
        attach(
                model,
                metadata.bucket(),
                metadata.objectKey(),
                metadata.etag(),
                metadata.versionId(),
                metadata.sizeBytes(),
                sha256);
        return true;
    }

    private void requirePersisted(Model model) {
        if (model.getId() == null || model.getOrganization() == null) {
            throw new IllegalStateException("Model must be persisted before storing its artifact");
        }
    }

    private void attach(
            Model model,
            String bucket,
            String objectKey,
            String etag,
            String versionId,
            long sizeBytes,
            String sha256) {
        model.setStorageBucket(bucket);
        model.setStorageObjectKey(objectKey);
        model.setStorageEtag(etag);
        model.setStorageVersionId(versionId);
        model.setModelSizeBytes(sizeBytes);
        model.setArtifactSha256(sha256);
        model.setArtifactState(ModelArtifactState.VERIFIED);
        model.setArtifactVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
        model.setArtifactMigrationError(null);
        if (!properties.isRetainInlineCopy()) {
            model.setModelFile(new byte[0]);
        }
    }

    private String objectKey(Model model, String sha256) {
        return "organizations/" + model.getOrganization().getId()
                + "/models/" + model.getId()
                + "/artifacts/" + sha256 + "/"
                + sanitize(model.getFileName());
    }

    private String sanitize(String value) {
        String fileName = value == null || value.isBlank() ? "model.bin" : value;
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_").replaceAll("_+", "_");
    }

    private void deleteExactVersion(StoredObject stored, RuntimeException original) {
        try {
            objectStorageService.delete(stored.bucket(), stored.objectKey(), stored.versionId());
        } catch (RuntimeException cleanupFailure) {
            original.addSuppressed(cleanupFailure);
        }
    }
}
