package dev.ulloasp.mlsuite.storage;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class ObjectStorageHealthIndicator implements HealthIndicator {

    private final ObjectStorageService objectStorage;
    private final StorageProperties properties;

    public ObjectStorageHealthIndicator(ObjectStorageService objectStorage, StorageProperties properties) {
        this.objectStorage = objectStorage;
        this.properties = properties;
    }

    @Override
    public Health health() {
        if (!properties.isEnabled()) {
            return Health.up().withDetail("enabled", false).build();
        }
        try {
            objectStorage.list("__mlsuite_healthcheck__/");
            return Health.up()
                    .withDetail("enabled", true)
                    .withDetail("bucket", properties.getBucket())
                    .build();
        } catch (RuntimeException ex) {
            return Health.down(ex)
                    .withDetail("enabled", true)
                    .withDetail("bucket", properties.getBucket())
                    .build();
        }
    }
}
