package dev.ulloasp.mlsuite.storage;

import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.ListObjectsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.StatObjectArgs;
import io.minio.errors.ErrorResponseException;
import io.minio.messages.Item;

class MinioObjectStorageService implements ObjectStorageService {

    private final MinioClient minioClient;
    private final StorageProperties properties;
    private final AtomicBoolean bucketEnsured = new AtomicBoolean(false);

    MinioObjectStorageService(MinioClient minioClient, StorageProperties properties) {
        this.minioClient = minioClient;
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

            PutObjectArgs.Builder builder = PutObjectArgs.builder()
                            .bucket(properties.getBucket())
                            .object(objectKey)
                            .contentType(effectiveContentType)
                            .stream(inputStream, sizeBytes, -1L);
            if (sha256 != null) {
                builder.userMetadata(Map.of("sha256", sha256));
            }

            var response = minioClient.putObject(builder.build());
            String versionId = response.versionId();
            if (versionId == null || versionId.isBlank()) {
                throw new ObjectStorageException("MinIO bucket versioning is required");
            }
            StoredObjectMetadata metadata = inspectVersion(objectKey, versionId);
            if (metadata.sizeBytes() != sizeBytes || sha256 != null && !sha256.equals(metadata.sha256())) {
                throw new ObjectStorageException("MinIO object verification failed for " + objectKey);
            }

            return new StoredObject(
                    properties.getBucket(),
                    objectKey,
                    sizeBytes,
                    response.etag(),
                    versionId,
                    sha256);
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo almacenar el modelo en MinIO", ex);
        }
    }

    @Override
    public byte[] load(String bucket, String objectKey) {
        return load(bucket, objectKey, null);
    }

    @Override
    public byte[] load(String bucket, String objectKey, String versionId) {
        ensureBucketExists();

        GetObjectArgs.Builder builder = GetObjectArgs.builder().bucket(bucket).object(objectKey);
        if (versionId != null && !versionId.isBlank()) {
            builder.versionId(versionId);
        }
        try (InputStream inputStream = minioClient.getObject(builder.build())) {
            return inputStream.readAllBytes();
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo cargar el modelo desde MinIO", ex);
        }
    }

    @Override
    public Optional<byte[]> loadOptional(String bucket, String objectKey) {
        return loadOptional(bucket, objectKey, null);
    }

    @Override
    public Optional<byte[]> loadOptional(String bucket, String objectKey, String versionId) {
        ensureBucketExists();

        try {
            StatObjectArgs.Builder builder = StatObjectArgs.builder().bucket(bucket).object(objectKey);
            if (versionId != null && !versionId.isBlank()) {
                builder.versionId(versionId);
            }
            minioClient.statObject(builder.build());
            return Optional.of(load(bucket, objectKey, versionId));
        } catch (ErrorResponseException ex) {
            if ("NoSuchKey".equals(ex.errorResponse().code()) || "NoSuchObject".equals(ex.errorResponse().code())) {
                return Optional.empty();
            }

            throw new ObjectStorageException("No se pudo comprobar el objeto en MinIO", ex);
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo comprobar el objeto en MinIO", ex);
        }
    }

    @Override
    public Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey) {
        return inspectOptional(bucket, objectKey, null);
    }

    @Override
    public Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey, String versionId) {
        ensureBucketExists();
        try {
            StatObjectArgs.Builder builder = StatObjectArgs.builder().bucket(bucket).object(objectKey);
            if (versionId != null && !versionId.isBlank()) {
                builder.versionId(versionId);
            }
            var response = minioClient.statObject(builder.build());
            return Optional.of(new StoredObjectMetadata(
                    bucket,
                    objectKey,
                    response.size(),
                    response.etag(),
                    response.versionId(),
                    response.userMetadata().getFirst("sha256")));
        } catch (ErrorResponseException ex) {
            if ("NoSuchKey".equals(ex.errorResponse().code()) || "NoSuchObject".equals(ex.errorResponse().code())) {
                return Optional.empty();
            }
            throw new ObjectStorageException("No se pudo comprobar el objeto en MinIO", ex);
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo comprobar el objeto en MinIO", ex);
        }
    }

    @Override
    public StoredObjectVerification verify(String bucket, String objectKey) {
        return verify(bucket, objectKey, null);
    }

    @Override
    public StoredObjectVerification verify(String bucket, String objectKey, String versionId) {
        ensureBucketExists();
        GetObjectArgs.Builder builder = GetObjectArgs.builder().bucket(bucket).object(objectKey);
        if (versionId != null && !versionId.isBlank()) {
            builder.versionId(versionId);
        }
        try (InputStream inputStream = minioClient.getObject(
                builder.build())) {
            long size = 0;
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
                size += read;
            }
            return new StoredObjectVerification(size, java.util.HexFormat.of().formatHex(digest.digest()));
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo verificar el objeto en MinIO", ex);
        }
    }

    @Override
    public List<StoredObjectItem> list(String prefix) {
        ensureBucketExists();

        try {
            List<StoredObjectItem> items = new ArrayList<>();
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(properties.getBucket())
                            .prefix(prefix)
                            .recursive(true)
                            .build());

            for (Result<Item> result : results) {
                Item item = result.get();
                items.add(new StoredObjectItem(
                        properties.getBucket(),
                        item.objectName(),
                        item.size(),
                        item.etag(),
                        item.lastModified() == null
                                ? null
                                : OffsetDateTime.ofInstant(item.lastModified().toInstant(), ZoneOffset.UTC)));
            }

            return items;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudieron listar objetos de MinIO", ex);
        }
    }

    @Override
    public void delete(String bucket, String objectKey) {
        delete(bucket, objectKey, null);
    }

    @Override
    public void delete(String bucket, String objectKey, String versionId) {
        ensureBucketExists();

        try {
            RemoveObjectArgs.Builder builder = RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey);
            if (versionId != null && !versionId.isBlank()) {
                builder.versionId(versionId);
            }
            minioClient.removeObject(builder.build());
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo eliminar el modelo de MinIO", ex);
        }
    }

    private void ensureBucketExists() {
        if (bucketEnsured.get()) {
            return;
        }

        try {
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(properties.getBucket()).build());

            if (!bucketExists) {
                if (!properties.isAutoCreateBucket()) {
                    throw new ObjectStorageException(
                            "El bucket '" + properties.getBucket() + "' no existe y auto-create está desactivado");
                }

                minioClient.makeBucket(MakeBucketArgs.builder()
                        .bucket(properties.getBucket())
                        .build());
            }

            bucketEnsured.set(true);
        } catch (ObjectStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo inicializar el bucket de MinIO", ex);
        }
    }

    private StoredObjectMetadata inspectVersion(String objectKey, String versionId) throws Exception {
        var response = minioClient.statObject(
                StatObjectArgs.builder()
                        .bucket(properties.getBucket())
                        .object(objectKey)
                        .versionId(versionId)
                        .build());
        return new StoredObjectMetadata(
                properties.getBucket(),
                objectKey,
                response.size(),
                response.etag(),
                versionId,
                response.userMetadata().getFirst("sha256"));
    }
}
