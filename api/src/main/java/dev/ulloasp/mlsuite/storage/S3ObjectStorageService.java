package dev.ulloasp.mlsuite.storage;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Object;

class S3ObjectStorageService implements ObjectStorageService {

    private static final String SHA256_METADATA = "sha256";

    private final S3Client client;
    private final StorageProperties properties;
    private final AtomicBoolean bucketEnsured = new AtomicBoolean(false);

    S3ObjectStorageService(S3Client client, StorageProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public StoredObject store(
            String objectKey,
            String fileName,
            String contentType,
            InputStream inputStream,
            long sizeBytes,
            String sha256) {
        ensureBucketExists();

        try {
            String effectiveContentType = contentType != null && !contentType.isBlank()
                    ? contentType
                    : "application/octet-stream";

            PutObjectRequest.Builder request = PutObjectRequest.builder()
                    .bucket(properties.getBucket())
                    .key(objectKey)
                    .contentType(effectiveContentType);
            if (sha256 != null) {
                request.metadata(Map.of(SHA256_METADATA, sha256));
            }

            PutObjectResponse response = client.putObject(
                    request.build(), RequestBody.fromInputStream(inputStream, sizeBytes));
            String versionId = response.versionId();
            if (versionId == null || versionId.isBlank()) {
                throw new ObjectStorageException("Object storage bucket versioning is required");
            }
            StoredObjectMetadata metadata = metadata(
                    properties.getBucket(), objectKey, head(properties.getBucket(), objectKey, versionId));
            if (metadata.sizeBytes() != sizeBytes || sha256 != null && !sha256.equals(metadata.sha256())) {
                throw new ObjectStorageException("Object verification failed for " + objectKey);
            }

            return new StoredObject(
                    properties.getBucket(),
                    objectKey,
                    sizeBytes,
                    etag(response.eTag()),
                    versionId,
                    sha256);
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo almacenar el objeto", ex);
        }
    }

    @Override
    public InputStream open(String bucket, String objectKey, String versionId) {
        ensureBucketExists();

        try {
            return client.getObject(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .versionId(blankToNull(versionId))
                    .build());
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo cargar el objeto", ex);
        }
    }

    @Override
    public Optional<byte[]> loadOptional(String bucket, String objectKey, String versionId) {
        return inspectOptional(bucket, objectKey, versionId).map(found -> load(bucket, objectKey, versionId));
    }

    @Override
    public Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey, String versionId) {
        ensureBucketExists();
        try {
            return Optional.of(metadata(bucket, objectKey, head(bucket, objectKey, versionId)));
        } catch (NoSuchKeyException ex) {
            return Optional.empty();
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo comprobar el objeto", ex);
        }
    }

    @Override
    public StoredObjectVerification verify(String bucket, String objectKey, String versionId) {
        try (InputStream inputStream = open(bucket, objectKey, versionId)) {
            long size = 0;
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
                size += read;
            }
            return new StoredObjectVerification(size, java.util.HexFormat.of().formatHex(digest.digest()));
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo verificar el objeto", ex);
        }
    }

    @Override
    public List<StoredObjectItem> list(String prefix) {
        ensureBucketExists();

        try {
            List<StoredObjectItem> items = new ArrayList<>();
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(properties.getBucket())
                    .prefix(prefix)
                    .build();

            for (S3Object object : client.listObjectsV2Paginator(request).contents()) {
                items.add(new StoredObjectItem(
                        properties.getBucket(),
                        object.key(),
                        object.size(),
                        etag(object.eTag()),
                        object.lastModified() == null
                                ? null
                                : OffsetDateTime.ofInstant(object.lastModified(), ZoneOffset.UTC)));
            }

            return items;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudieron listar los objetos", ex);
        }
    }

    @Override
    public void delete(String bucket, String objectKey, String versionId) {
        ensureBucketExists();

        try {
            client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .versionId(blankToNull(versionId))
                    .build());
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo eliminar el objeto", ex);
        }
    }

    @Override
    public void deleteAllVersions(String bucket, String objectKey) {
        ensureBucketExists();

        try {
            for (var page : client.listObjectVersionsPaginator(request -> request.bucket(bucket).prefix(objectKey))) {
                page.versions().stream().filter(version -> objectKey.equals(version.key()))
                        .forEach(version -> delete(bucket, objectKey, version.versionId()));
                page.deleteMarkers().stream().filter(marker -> objectKey.equals(marker.key()))
                        .forEach(marker -> delete(bucket, objectKey, marker.versionId()));
            }
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo eliminar el objeto", ex);
        }
    }

    private void ensureBucketExists() {
        if (bucketEnsured.get()) {
            return;
        }

        try {
            try {
                client.headBucket(HeadBucketRequest.builder().bucket(properties.getBucket()).build());
            } catch (NoSuchBucketException missing) {
                if (!properties.isAutoCreateBucket()) {
                    throw new ObjectStorageException(
                            "El bucket '" + properties.getBucket() + "' no existe y auto-create está desactivado");
                }

                client.createBucket(request -> request.bucket(properties.getBucket()));
            }

            bucketEnsured.set(true);
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo inicializar el bucket", ex);
        }
    }

    private HeadObjectResponse head(String bucket, String objectKey, String versionId) {
        return client.headObject(HeadObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .versionId(blankToNull(versionId))
                .build());
    }

    private StoredObjectMetadata metadata(String bucket, String objectKey, HeadObjectResponse response) {
        return new StoredObjectMetadata(
                bucket,
                objectKey,
                response.contentLength(),
                etag(response.eTag()),
                response.versionId(),
                response.metadata().get(SHA256_METADATA));
    }

    /** S3 quotes ETags on the wire; the persisted identity is the bare value. */
    private static String etag(String value) {
        return value == null ? null : value.replace("\"", "");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
