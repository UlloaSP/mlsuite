package dev.ulloasp.mlsuite.storage;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import lombok.RequiredArgsConstructor;

/** Reads every model's exact object version and compares it with what the model's row persists. */
@RequiredArgsConstructor
public class ArtifactVerificationService {

    private static final Logger log = LoggerFactory.getLogger(ArtifactVerificationService.class);
    static final int PAGE = 200;

    private final ObjectStorageService storage;
    private final ModelRepository models;

    public ArtifactVerificationReport verify() {
        long examined = 0;
        long failed = 0;
        long after = 0;
        List<ModelArtifactReference> page;
        do {
            page = models.findArtifactsAfter(after, Limit.of(PAGE));
            for (ModelArtifactReference artifact : page) {
                examined++;
                if (!matches(artifact)) {
                    failed++;
                }
                after = artifact.modelId();
            }
        } while (page.size() == PAGE);
        return new ArtifactVerificationReport(examined, failed);
    }

    private boolean matches(ModelArtifactReference artifact) {
        try {
            StoredObjectVerification stored = storage.verify(artifact.bucket(), artifact.objectKey(),
                    artifact.versionId());
            if (stored.sizeBytes() == artifact.sizeBytes() && stored.sha256().equals(artifact.sha256())) {
                return true;
            }
            log.error("Model {}: object {} version {} does not match its row", artifact.modelId(),
                    artifact.objectKey(), artifact.versionId());
        } catch (RuntimeException failure) {
            log.error("Model {}: object {} version {} could not be read: {}", artifact.modelId(),
                    artifact.objectKey(), artifact.versionId(), failure.getMessage());
        }
        return false;
    }
}
