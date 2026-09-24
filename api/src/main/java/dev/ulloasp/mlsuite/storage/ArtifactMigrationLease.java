package dev.ulloasp.mlsuite.storage;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

final class ArtifactMigrationLease implements AutoCloseable {

    private final ScheduledExecutorService executor;
    private final AtomicBoolean owned = new AtomicBoolean(true);

    ArtifactMigrationLease(
            ArtifactMigrationQueue queue,
            Long modelId,
            String leaseToken,
            long staleAfterSeconds) {
        long interval = Math.max(1, staleAfterSeconds / 3);
        executor = Executors.newSingleThreadScheduledExecutor(runnable ->
                Thread.ofPlatform()
                        .daemon(true)
                        .name("artifact-lease-" + modelId)
                        .unstarted(runnable));
        executor.scheduleAtFixedRate(() -> {
            try {
                if (!queue.renew(modelId, leaseToken)) {
                    owned.set(false);
                }
            } catch (RuntimeException failure) {
                owned.set(false);
            }
        }, interval, interval, TimeUnit.SECONDS);
    }

    boolean isOwned() {
        return owned.get();
    }

    @Override
    public void close() {
        executor.shutdownNow();
    }
}
