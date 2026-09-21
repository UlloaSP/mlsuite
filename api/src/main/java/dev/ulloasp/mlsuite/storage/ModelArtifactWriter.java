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

    public void storeAndAttach(Model model, byte[] bytes, String contentType) {
        if (model.getId() == null || model.getOrganization() == null) {
            throw new IllegalStateException("Model must be persisted before storing its artifact");
        }
        String sha256 = ArtifactHash.sha256(bytes);
        String objectKey = objectKey(model, sha256);
        StoredObject stored = objectStorageService.store(objectKey, model.getFileName(), contentType, bytes);
        try {
            byte[] readBack = objectStorageService.load(stored.bucket(), stored.objectKey());
            if (readBack.length != bytes.length || !sha256.equals(ArtifactHash.sha256(readBack))) {
                throw new ArtifactIntegrityException("Uploaded artifact verification failed for model " + model.getId());
            }
        } catch (RuntimeException ex) {
            try {
                objectStorageService.delete(stored.bucket(), stored.objectKey(), stored.versionId());
            } catch (RuntimeException cleanupFailure) {
                ex.addSuppressed(cleanupFailure);
            }
            throw ex;
        }

        model.setStorageBucket(stored.bucket());
        model.setStorageObjectKey(stored.objectKey());
        model.setStorageEtag(stored.etag());
        model.setStorageVersionId(stored.versionId());
        model.setModelSizeBytes(stored.sizeBytes());
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
}
