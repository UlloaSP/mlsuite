package dev.ulloasp.mlsuite.storage;

import dev.ulloasp.mlsuite.model.domain.model.Model;

/** Where a model's artifact is kept and the identity it must match, read without the artifact. */
public record ModelArtifactReference(
        Long modelId,
        String fileName,
        String bucket,
        String objectKey,
        String versionId,
        Long sizeBytes,
        String sha256) {

    public static ModelArtifactReference of(Model model) {
        return new ModelArtifactReference(model.getId(), model.getFileName(), model.getStorageBucket(),
                model.getStorageObjectKey(), model.getStorageVersionId(), model.getModelSizeBytes(),
                model.getArtifactSha256());
    }
}
