package dev.ulloasp.mlsuite.storage;

import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ObjectStorageHealthIndicator implements HealthIndicator {

    private final ObjectStorageService objectStorage;
    private final StorageProperties properties;

    @Override
    public Health health() {
        try {
            objectStorage.list("__mlsuite_healthcheck__/");
            return Health.up().withDetail("bucket", properties.getBucket()).build();
        } catch (RuntimeException ex) {
            return Health.down(ex).withDetail("bucket", properties.getBucket()).build();
        }
    }
}
