package dev.ulloasp.mlsuite.storage;

final class LostArtifactMigrationClaimException extends RuntimeException {

    LostArtifactMigrationClaimException(Long modelId) {
        super("Artifact migration claim was lost for model " + modelId);
    }
}
