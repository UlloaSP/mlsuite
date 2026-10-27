package dev.ulloasp.mlsuite.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * The copy of a model's artifact kept in its row ({@code model.model_file}, see
 * STORAGE_RETAIN_INLINE_COPY), written and read as streams over JDBC, never through the entity,
 * so no artifact is held whole in the API's memory. It is written in the caller's transaction.
 */
@Component
@RequiredArgsConstructor
public class ModelArtifactInlineCopy {

    /** How much of the copy one read fetches: PostgreSQL returns a bytea value whole. */
    static final int CHUNK_BYTES = 4 * 1024 * 1024;

    private final JdbcTemplate jdbc;

    /** Writes the copy, checking while it streams that it is the artifact {@code sha256} names. */
    public void write(Long modelId, ArtifactSource source, String sha256) {
        try (InputStream in = new VerifyingInputStream(source.open(), "model " + modelId, source.sizeBytes(), sha256)) {
            jdbc.update("UPDATE model SET model_file = ? WHERE id = ?", statement -> {
                statement.setBinaryStream(1, in, source.sizeBytes());
                statement.setLong(2, modelId);
            });
        } catch (IOException ex) {
            throw new UncheckedIOException("The artifact of model " + modelId + " could not be read", ex);
        }
    }

    /** The size of the copy: 0 when none is kept. */
    public long size(Long modelId) {
        Long size = jdbc.queryForObject("SELECT octet_length(model_file) FROM model WHERE id = ?", Long.class, modelId);
        return size == null ? 0 : size;
    }

    /** Reads the copy a chunk at a time. */
    public InputStream open(Long modelId) {
        long size = size(modelId);
        return new InputStream() {
            private byte[] chunk = new byte[0];
            private int position;
            private long fetched;

            @Override
            public int read() {
                if (!fill()) return -1;
                return chunk[position++] & 0xff;
            }

            @Override
            public int read(byte[] buffer, int offset, int length) {
                if (length == 0) return 0;
                if (!fill()) return -1;
                int read = Math.min(length, chunk.length - position);
                System.arraycopy(chunk, position, buffer, offset, read);
                position += read;
                return read;
            }

            private boolean fill() {
                if (position < chunk.length) return true;
                if (fetched >= size) return false;
                // substring() counts bytes from 1.
                chunk = jdbc.queryForObject("SELECT substring(model_file FROM ? FOR ?) FROM model WHERE id = ?",
                        byte[].class, fetched + 1, CHUNK_BYTES, modelId);
                if (chunk == null || chunk.length == 0) return false;
                fetched += chunk.length;
                position = 0;
                return true;
            }
        };
    }
}
