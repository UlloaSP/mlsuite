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
                byte[] stored = objectStorageService.load(
                        model.getStorageBucket(), model.getStorageObjectKey(), model.getStorageVersionId());
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
        ArtifactIntegrityVerifier.verify(
                "model " + model.getId(), model.getModelSizeBytes(), model.getArtifactSha256(), bytes);
    }
}
