package dev.ulloasp.mlsuite.storage;

import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ModelArtifactWriter {

    private final ObjectStorageService objectStorageService;

    /**
     * Streams the artifact into the object store, checking as it goes that it is the one
     * {@code sha256} names, then checks the stored object and points the model at it. The model
     * has no id yet, since its row is written naming the object, so its key has an id of its own.
     */
    public StoredObject storeAndAttach(Model model, ArtifactSource source, String sha256, String contentType) {
        String artifact = "model " + model.getName();
        String objectKey = objectKey(model, sha256);
        StoredObject stored;
        try (InputStream in = new VerifyingInputStream(source.open(), artifact, source.sizeBytes(), sha256)) {
            stored = objectStorageService.store(objectKey, model.getFileName(), contentType, in, source.sizeBytes(), sha256);
        } catch (IOException ex) {
            throw new ObjectStorageException("The artifact of " + artifact + " could not be read", ex);
        }
        try {
            ArtifactIntegrityVerifier.verify(artifact, source.sizeBytes(), sha256,
                    objectStorageService.verify(stored.bucket(), stored.objectKey(), stored.versionId()));
        } catch (RuntimeException failure) {
            deleteExactVersion(stored, failure);
            throw failure;
        }

        model.setStorageBucket(stored.bucket());
        model.setStorageObjectKey(stored.objectKey());
        model.setStorageEtag(stored.etag());
        model.setStorageVersionId(stored.versionId());
        model.setModelSizeBytes(stored.sizeBytes());
        model.setArtifactSha256(sha256);
        model.setArtifactVerifiedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return stored;
    }

    private String objectKey(Model model, String sha256) {
        return "organizations/" + model.getOrganization().getId()
                + "/models/" + UUID.randomUUID()
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
