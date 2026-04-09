package dev.ulloasp.mlsuite.storage;

class DisabledObjectStorageService implements ObjectStorageService {

    private static final String MESSAGE = "Object storage is disabled";

    @Override
    public StoredObject store(String objectKey, String fileName, String contentType, java.io.InputStream inputStream,
            long sizeBytes) {
        throw new ObjectStorageException(MESSAGE);
    }

    @Override
    public byte[] load(String bucket, String objectKey) {
        throw new ObjectStorageException(MESSAGE);
    }

    @Override
    public void delete(String bucket, String objectKey) {
    }
}
