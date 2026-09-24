package dev.ulloasp.mlsuite.storage;

import java.util.Map;

import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.stereotype.Component;

@Component
public class StorageDeletionInfoContributor implements InfoContributor {

    private final StorageDeletionTaskRepository tasks;

    public StorageDeletionInfoContributor(StorageDeletionTaskRepository tasks) {
        this.tasks = tasks;
    }

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("storageDeletionQueue", Map.of(
                "pending", tasks.countByStatus(StorageDeletionStatus.PENDING),
                "running", tasks.countByStatus(StorageDeletionStatus.RUNNING),
                "failed", tasks.countByStatus(StorageDeletionStatus.FAILED)));
    }
}
