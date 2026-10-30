package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.port.in.ModelUploadUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StoredObjectVerification;

/**
 * An uploaded bundle goes from the upload's temporary file to the runtime and the object store as
 * streams: storing a 48 MB bundle allocates far less than one copy of it on the thread that stores
 * it, and the stored object is the bundle the hash names, which the model's row records.
 */
class ModelUploadStreamingTest extends PublicPredictionFixture {

    private static final int SIZE = 48 * 1024 * 1024;
    private static final Map<String, Object> INSPECTION = Map.of("type", "classifier", "specificType", "Forest",
            "fileName", "big.mlbundle", "schema", Map.of("fields", List.of(), "reports", List.of()),
            "manifest", Map.of("writer_version", "0.2.1"), "environment", Map.of("key", "legacy"));

    @MockitoBean ObjectStorageService storage;
    @Autowired ModelUploadUseCase uploads;
    @Autowired JdbcTemplate jdbc;
    private Path bundle;
    private String sha256;
    private final StoredObjectVerification[] stored = new StoredObjectVerification[1];

    @BeforeEach
    void aLargeBundleOnDisk() throws Exception {
        authorizeOwner();
        bundle = Files.createTempFile("bundle", ".mlbundle");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] chunk = new byte[1024 * 1024];
        Random random = new Random(7);
        try (OutputStream out = Files.newOutputStream(bundle)) {
            for (int written = 0; written < SIZE; written += chunk.length) {
                random.nextBytes(chunk);
                digest.update(chunk);
                out.write(chunk);
            }
        }
        sha256 = HexFormat.of().formatHex(digest.digest());
        when(analyzer.inspect(any())).thenReturn(INSPECTION);
        // The store reads what it is given as an S3 client does, a buffer at a time, and remembers its hash.
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), anyLong(), anyString()))
                .thenAnswer(call -> {
                    StoredObjectVerification read = drain(call.getArgument(3));
                    stored[0] = read;
                    return new StoredObject("models", call.getArgument(0), read.sizeBytes(), "etag", "v1",
                            call.getArgument(5));
                });
        when(storage.verify(eq("models"), anyString(), eq("v1"))).thenAnswer(call -> stored[0]);
    }

    @AfterEach
    void removeTheBundle() throws IOException {
        Files.deleteIfExists(bundle);
    }

    @Test
    void aLargeBundleIsStoredWithoutBeingHeldInMemory() {
        var threads = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long before = threads.getCurrentThreadAllocatedBytes();

        Model model = uploads.createModel(owner.getId(), "Big forest", new TemporaryFileUpload(bundle));

        long allocated = threads.getCurrentThreadAllocatedBytes() - before;
        assertTrue(allocated < SIZE / 2, "allocated " + allocated + " bytes to store a " + SIZE + " byte bundle");
        assertEquals(SIZE, stored[0].sizeBytes());
        assertEquals(sha256, stored[0].sha256());
        Map<String, Object> row = jdbc.queryForMap("SELECT model_size_bytes, artifact_sha256, storage_bucket, "
                + "storage_version_id, storage_etag FROM model WHERE id = ?", model.getId());
        assertEquals((long) SIZE, ((Number) row.get("model_size_bytes")).longValue());
        assertEquals(sha256, row.get("artifact_sha256"));
        assertEquals("models", row.get("storage_bucket"));
        assertEquals("v1", row.get("storage_version_id"));
        assertEquals("etag", row.get("storage_etag"));
    }

    private static StoredObjectVerification drain(InputStream in) {
        try (in) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[64 * 1024];
            long size = 0;
            for (int read = in.read(buffer); read != -1; read = in.read(buffer)) {
                digest.update(buffer, 0, read);
                size += read;
            }
            return new StoredObjectVerification(size, HexFormat.of().formatHex(digest.digest()));
        } catch (Exception ex) {
            throw new ObjectStorageException("store failed", ex);
        }
    }

    /** An upload as the servlet container leaves it: a temporary file, read whole only by getBytes. */
    private record TemporaryFileUpload(Path file) implements MultipartFile {
        @Override
        public String getName() {
            return "modelFile";
        }

        @Override
        public String getOriginalFilename() {
            return "big.mlbundle";
        }

        @Override
        public String getContentType() {
            return "application/octet-stream";
        }

        @Override
        public boolean isEmpty() {
            return getSize() == 0;
        }

        @Override
        public long getSize() {
            try {
                return Files.size(file);
            } catch (IOException ex) {
                throw new IllegalStateException(ex);
            }
        }

        @Override
        public byte[] getBytes() throws IOException {
            return Files.readAllBytes(file);
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return Files.newInputStream(file);
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException {
            Files.copy(file, dest.toPath());
        }
    }
}
