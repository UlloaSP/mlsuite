package dev.ulloasp.mlsuite.storage;

import java.io.IOException;
import java.io.InputStream;

/**
 * An artifact read as streams and never whole: its size, and a way to read it again from the
 * start. An upload's temporary file and a stored object are both read this way.
 */
public interface ArtifactSource {

    long sizeBytes();

    InputStream open() throws IOException;
}
