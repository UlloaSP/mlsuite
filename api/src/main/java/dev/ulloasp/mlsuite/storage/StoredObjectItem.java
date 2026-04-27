package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;

public record StoredObjectItem(
        String bucket,
        String objectKey,
        long sizeBytes,
        String etag,
        OffsetDateTime lastModified) {
}
