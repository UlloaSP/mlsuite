package dev.ulloasp.mlsuite.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import lombok.RequiredArgsConstructor;

/**
 * Reads a model's artifact, verified against its persisted identity: the stored object, or the
 * inline copy when the object cannot be read. The inline copy is read by its own query, so a
 * caller holds no model entity and no transaction for it.
 */
@Service
@RequiredArgsConstructor
public class ModelArtifactContentReader {

    private static final Logger log = LoggerFactory.getLogger(ModelArtifactContentReader.class);
    private final ObjectStorageService objectStorageService;
    private final ModelRepository modelRepository;

    public byte[] loadVerified(ModelArtifactReference artifact) {
        if (artifact.hasStoredObject()) {
            try {
                byte[] stored = objectStorageService.load(artifact.bucket(), artifact.objectKey(), artifact.versionId());
                verify(artifact, stored);
                return stored;
            } catch (ObjectStorageException | ArtifactIntegrityException ex) {
                byte[] inline = inlineCopy(artifact);
                if (inline.length == 0) {
                    throw ex;
                }
                log.warn("Using verified inline fallback for model {} after object storage read failed",
                        artifact.modelId(), ex);
                verify(artifact, inline);
                return inline;
            }
        }

        byte[] inline = inlineCopy(artifact);
        if (inline.length > 0) {
            verify(artifact, inline);
            return inline;
        }
        throw new ArtifactIntegrityException("Model " + artifact.modelId() + " has no readable artifact");
    }

    private byte[] inlineCopy(ModelArtifactReference artifact) {
        return modelRepository.findModelFile(artifact.modelId()).orElse(new byte[0]);
    }

    private void verify(ModelArtifactReference artifact, byte[] bytes) {
        ArtifactIntegrityVerifier.verify(
                "model " + artifact.modelId(), artifact.sizeBytes(), artifact.sha256(), bytes);
    }
}
