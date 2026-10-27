package dev.ulloasp.mlsuite.storage;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Hashes an artifact as it is read and, at its end, checks it against the identity it must
 * match, so a copy written from it is verified without holding it. The end is the expected size
 * when there is one, since writers that know the size read no further. A mismatch fails the read
 * that reaches the end, before whoever writes the copy can finish it.
 */
public final class VerifyingInputStream extends FilterInputStream {

    private final String artifact;
    private final Long expectedSize;
    private final String expectedSha256;
    private final MessageDigest digest;
    private long size;
    private boolean checked;

    /** {@code expectedSha256} may be null for an artifact stored before artifacts were hashed. */
    public VerifyingInputStream(InputStream in, String artifact, Long expectedSize, String expectedSha256) {
        super(in);
        this.artifact = artifact;
        this.expectedSize = expectedSize;
        this.expectedSha256 = expectedSha256;
        try {
            this.digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    @Override
    public int read() throws IOException {
        int value = super.read();
        if (value == -1) {
            check();
        } else {
            digest.update((byte) value);
            size++;
            if (atExpectedEnd()) check();
        }
        return value;
    }

    @Override
    public int read(byte[] buffer, int offset, int length) throws IOException {
        int read = super.read(buffer, offset, length);
        if (read == -1) {
            check();
        } else {
            digest.update(buffer, offset, read);
            size += read;
            if (atExpectedEnd()) check();
        }
        return read;
    }

    @Override
    public long skip(long n) throws IOException {
        throw new IOException("A verified artifact is read whole");
    }

    @Override
    public boolean markSupported() {
        return false;
    }

    private boolean atExpectedEnd() {
        return expectedSize != null && size >= expectedSize;
    }

    private void check() throws IOException {
        if (checked) return;
        checked = true;
        try {
            ArtifactIntegrityVerifier.verify(artifact, expectedSize, expectedSha256,
                    new StoredObjectVerification(size, HexFormat.of().formatHex(digest.digest())));
        } catch (ArtifactIntegrityException mismatch) {
            throw new IOException(mismatch.getMessage(), mismatch);
        }
    }
}
