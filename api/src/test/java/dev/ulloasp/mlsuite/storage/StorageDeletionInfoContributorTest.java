package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.info.Info;

class StorageDeletionInfoContributorTest {

    @Test
    void publishesActionableQueueCountsWithoutChangingReadiness() {
        StorageDeletionTaskRepository tasks = mock(StorageDeletionTaskRepository.class);
        when(tasks.countByStatus(StorageDeletionStatus.PENDING)).thenReturn(4L);
        when(tasks.countByStatus(StorageDeletionStatus.RUNNING)).thenReturn(2L);
        when(tasks.countByStatus(StorageDeletionStatus.FAILED)).thenReturn(1L);
        Info.Builder info = new Info.Builder();

        new StorageDeletionInfoContributor(tasks).contribute(info);

        assertEquals(Map.of("storageDeletionQueue", Map.of(
                "pending", 4L,
                "running", 2L,
                "failed", 1L)), info.build().getDetails());
    }
}
