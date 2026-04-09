package dev.ulloasp.mlsuite.storage;

import java.io.InputStream;
import java.util.concurrent.atomic.AtomicBoolean;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;

class MinioObjectStorageService implements ObjectStorageService {

    private final MinioClient minioClient;
    private final StorageProperties properties;
    private final AtomicBoolean bucketEnsured = new AtomicBoolean(false);

    MinioObjectStorageService(MinioClient minioClient, StorageProperties properties) {
        this.minioClient = minioClient;
        this.properties = properties;
    }

    @Override
    public StoredObject store(String objectKey, String fileName, String contentType, InputStream inputStream,
            long sizeBytes) {
        ensureBucketExists();

        try {
            String effectiveContentType = contentType != null && !contentType.isBlank()
                    ? contentType
                    : "application/octet-stream";

            String etag = minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(properties.getBucket())
                            .object(objectKey)
                            .contentType(effectiveContentType)
                            .stream(inputStream, sizeBytes, -1)
                            .build())
                    .etag();

            return new StoredObject(properties.getBucket(), objectKey, sizeBytes, etag);
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
    public void delete(String bucket, String objectKey) {
        ensureBucketExists();

        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
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
