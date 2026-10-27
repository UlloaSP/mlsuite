package dev.ulloasp.mlsuite.storage;

import java.io.InputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

/**
 * Reads a model's artifact as a stream, verified against its persisted identity while it is read:
 * the stored object, or the inline copy when the object cannot be opened. Neither is held whole,
 * and the inline copy is read by its own queries, so a caller holds no model entity for it.
 */
@Service
@RequiredArgsConstructor
public class ModelArtifactContentReader {

    private static final Logger log = LoggerFactory.getLogger(ModelArtifactContentReader.class);
    private final ObjectStorageService objectStorageService;
    private final ModelArtifactInlineCopy inlineCopy;

    /** The artifact, to be read as many times as needed; each read is verified to its end. */
    public ArtifactSource source(ModelArtifactReference artifact) {
        return new ArtifactSource() {
            @Override
            public long sizeBytes() {
                return artifact.sizeBytes() != null ? artifact.sizeBytes() : inlineCopy.size(artifact.modelId());
            }

            @Override
            public InputStream open() {
                return new VerifyingInputStream(raw(artifact), "model " + artifact.modelId(),
                        artifact.sizeBytes(), artifact.sha256());
            }
        };
    }

    private InputStream raw(ModelArtifactReference artifact) {
        if (artifact.hasStoredObject()) {
            try {
                return objectStorageService.open(artifact.bucket(), artifact.objectKey(), artifact.versionId());
            } catch (ObjectStorageException ex) {
                if (inlineCopy.size(artifact.modelId()) == 0) {
                    throw ex;
                }
                log.warn("Using the inline copy of model {} after the object store could not be read",
                        artifact.modelId(), ex);
            }
        }
        if (inlineCopy.size(artifact.modelId()) > 0) {
            return inlineCopy.open(artifact.modelId());
        }
        throw new ArtifactIntegrityException("Model " + artifact.modelId() + " has no readable artifact");
    }
}
