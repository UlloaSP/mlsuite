package dev.ulloasp.mlsuite.model.application.runtime;

import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;

/**
 * What running a model needs: its artifact, the environment it runs in and whether it can run
 * there yet, read without the artifact.
 */
public record RunnableModel(ModelArtifactReference artifact, String environmentKey, ModelRuntimeState state) {

    /** The flat form a JPQL constructor expression fills. */
    public RunnableModel(Long modelId, String fileName, String bucket, String objectKey, String versionId,
            Long sizeBytes, String sha256, String environmentKey, ModelRuntimeState state) {
        this(new ModelArtifactReference(modelId, fileName, bucket, objectKey, versionId, sizeBytes, sha256),
                environmentKey, state);
    }

    public Long modelId() {
        return artifact.modelId();
    }
}
