package dev.ulloasp.mlsuite.storage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * An artifact read as streams and never whole: its size, and a way to read it again from the
 * start. An upload's temporary file, a stored object and an inline copy are all read this way.
 */
public interface ArtifactSource {

    long sizeBytes();

    InputStream open() throws IOException;

    /** An artifact already in memory: what the offline migration of inline copies reads. */
    static ArtifactSource of(byte[] bytes) {
        return new ArtifactSource() {
            @Override
            public long sizeBytes() {
                return bytes.length;
            }

            @Override
            public InputStream open() {
                return new ByteArrayInputStream(bytes);
            }
        };
    }
}
