package dev.ulloasp.mlsuite.storage;

public final class ArtifactIntegrityVerifier {

    private ArtifactIntegrityVerifier() {
    }

    public static void verify(String artifact, Long expectedSize, String expectedSha256, byte[] bytes) {
        verify(artifact, expectedSize, expectedSha256,
                new StoredObjectVerification(bytes.length, ArtifactHash.sha256(bytes)));
    }

    public static void verify(
            String artifact,
            Long expectedSize,
            String expectedSha256,
            StoredObjectVerification actual) {
        if (expectedSize != null && expectedSize != actual.sizeBytes()) {
            throw new ArtifactIntegrityException("Size mismatch for " + artifact);
        }
        if (expectedSha256 != null && !expectedSha256.equals(actual.sha256())) {
            throw new ArtifactIntegrityException("SHA-256 mismatch for " + artifact);
        }
    }

    public static void verifyRequired(
            String artifact,
            Long expectedSize,
            String expectedSha256,
            StoredObjectVerification actual) {
        if (expectedSize == null || expectedSha256 == null) {
            throw new ArtifactIntegrityException("Missing persisted identity for " + artifact);
        }
        verify(artifact, expectedSize, expectedSha256, actual);
    }
}
