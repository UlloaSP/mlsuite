package dev.ulloasp.mlsuite.storage;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class ObjectStorageConfig {

    @Bean
    ObjectStorageService objectStorageService(StorageProperties properties) {
        if (!properties.isEnabled()) {
            return new DisabledObjectStorageService();
        }

        MinioClient minioClient = MinioClient.builder()
                .endpoint(properties.getEndpoint())
                .credentials(properties.getAccessKey(), properties.getSecretKey())
                .build();

        return new MinioObjectStorageService(minioClient, properties);
    }
}
