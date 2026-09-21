package dev.ulloasp.mlsuite.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.model.domain.model.Model;

@Service
public class ModelArtifactContentReader {

    private static final Logger log = LoggerFactory.getLogger(ModelArtifactContentReader.class);
    private final ObjectStorageService objectStorageService;

    public ModelArtifactContentReader(ObjectStorageService objectStorageService) {
        this.objectStorageService = objectStorageService;
    }

    public byte[] loadVerified(Model model) {
        if (model.hasStoredObject()) {
            try {
                byte[] stored = objectStorageService.load(model.getStorageBucket(), model.getStorageObjectKey());
                verify(model, stored);
                return stored;
            } catch (ObjectStorageException | ArtifactIntegrityException ex) {
                if (!model.hasInlineModelFile()) {
                    throw ex;
                }
                log.warn("Using verified inline fallback for model {} after object storage read failed", model.getId(), ex);
            }
        }

        if (model.hasInlineModelFile()) {
            byte[] inline = model.getModelFile();
            verify(model, inline);
            return inline;
        }
        throw new ArtifactIntegrityException("Model " + model.getId() + " has no readable artifact");
    }

    private void verify(Model model, byte[] bytes) {
        if (model.getModelSizeBytes() != null && model.getModelSizeBytes() != bytes.length) {
            throw new ArtifactIntegrityException("Artifact size mismatch for model " + model.getId());
        }
        if (model.getArtifactSha256() != null
                && !model.getArtifactSha256().equals(ArtifactHash.sha256(bytes))) {
            throw new ArtifactIntegrityException("Artifact SHA-256 mismatch for model " + model.getId());
        }
    }
}
