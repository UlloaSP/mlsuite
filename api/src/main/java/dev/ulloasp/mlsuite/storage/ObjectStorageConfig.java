package dev.ulloasp.mlsuite.storage;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class ObjectStorageConfig {

    private static final Duration CONNECTION_TIMEOUT = Duration.ofSeconds(10);
    // The server answers a large PUT only once it has persisted it; the client default of 30s is too short.
    private static final Duration SOCKET_TIMEOUT = Duration.ofMinutes(5);

    @Bean
    ObjectStorageService objectStorageService(StorageProperties properties) {
        if (!properties.isEnabled()) {
            return new DisabledObjectStorageService();
        }

        return new S3ObjectStorageService(s3Client(properties), properties);
    }

    // Artifact integrity is the persisted SHA-256, so the SDK's own trailing checksums add nothing.
    static S3Client s3Client(StorageProperties properties) {
        return S3Client.builder()
                .endpointOverride(URI.create(properties.getEndpoint()))
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey())))
                .forcePathStyle(true)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .httpClient(UrlConnectionHttpClient.builder()
                        .connectionTimeout(CONNECTION_TIMEOUT)
                        .socketTimeout(SOCKET_TIMEOUT)
                        .build())
                .build();
    }
}
