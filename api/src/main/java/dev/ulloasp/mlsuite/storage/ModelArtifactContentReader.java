package dev.ulloasp.mlsuite.storage;

import java.io.InputStream;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

/**
 * Reads a model's artifact from the object store as a stream, verified against its persisted
 * identity while it is read, never held whole.
 */
@Service
@RequiredArgsConstructor
public class ModelArtifactContentReader {

    private final ObjectStorageService objectStorageService;

    /** The artifact, to be read as many times as needed; each read is verified to its end. */
    public ArtifactSource source(ModelArtifactReference artifact) {
        return new ArtifactSource() {
            @Override
            public long sizeBytes() {
                return artifact.sizeBytes();
            }

            @Override
            public InputStream open() {
                return new VerifyingInputStream(
                        objectStorageService.open(artifact.bucket(), artifact.objectKey(), artifact.versionId()),
                        "model " + artifact.modelId(), artifact.sizeBytes(), artifact.sha256());
            }
        };
    }
}
