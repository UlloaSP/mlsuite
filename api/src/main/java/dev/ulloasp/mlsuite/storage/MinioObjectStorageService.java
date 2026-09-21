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
                            .stream(inputStream, sizeBytes, -1);
            if (sha256 != null) {
                builder.userMetadata(Map.of("sha256", sha256));
            }

            var response = minioClient.putObject(builder.build());
            StoredObjectMetadata metadata = inspectOptional(properties.getBucket(), objectKey)
                    .orElseThrow(() -> new ObjectStorageException("MinIO did not expose the uploaded object"));
            if (metadata.sizeBytes() != sizeBytes || sha256 != null && !sha256.equals(metadata.sha256())) {
                throw new ObjectStorageException("MinIO object verification failed for " + objectKey);
            }

            return new StoredObject(
                    properties.getBucket(),
                    objectKey,
                    sizeBytes,
                    response.etag(),
                    metadata.versionId(),
                    sha256);
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo almacenar el modelo en MinIO", ex);
        }
    }

    @Override
    public byte[] load(String bucket, String objectKey) {
        ensureBucketExists();

        try (InputStream inputStream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectKey)
                        .build())) {
            return inputStream.readAllBytes();
        } catch (Exception ex) {
            throw new ObjectStorageException("No se pudo cargar el modelo desde MinIO", ex);
        }
    }

    @Override
    public Optional<byte[]> loadOptional(String bucket, String objectKey) {
        ensureBucketExists();

        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build());
            return Optional.of(load(bucket, objectKey));
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
        ensureBucketExists();
        try {
            var response = minioClient.statObject(
                    StatObjectArgs.builder().bucket(bucket).object(objectKey).build());
            return Optional.of(new StoredObjectMetadata(
                    bucket,
                    objectKey,
                    response.size(),
                    response.etag(),
                    response.versionId(),
                    response.userMetadata().get("sha256")));
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
        ensureBucketExists();
        try (InputStream inputStream = minioClient.getObject(
                GetObjectArgs.builder().bucket(bucket).object(objectKey).build())) {
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
}
