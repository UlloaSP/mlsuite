package dev.ulloasp.mlsuite.admin.purge;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.annotation.PreDestroy;

/**
 * Runs purges on the server. Each API instance claims one at a time (PurgeLedger) and goes through
 * its phases, committing every batch with the phase's progress, so a crash loses at most one batch
 * and the job is claimed again from the phase it reached. A failed purge stays failed, with its
 * error, until a superadmin retries it.
 *
 * <p>It has a thread of its own rather than {@code @Scheduled}: every fixed-delay scheduled task
 * shares one thread, which a bulk job holds until it ends and a long purge would take from bulk
 * jobs, model preparation and every other scheduled task.
 */
@Component
class PurgeWorker {

    private static final Logger log = LoggerFactory.getLogger(PurgeWorker.class);

    private final String worker = "api-" + UUID.randomUUID();
    private final PurgeLedger ledger;
    private final PurgeSteps steps;
    private final PurgeOutcomes outcomes;
    private final TransactionTemplate transactions;
    private final int batchSize;
    private final int leaseSeconds;
    private final long pollMs;
    private final ScheduledExecutorService schedule = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("purge-worker").factory());

    PurgeWorker(PurgeLedger ledger, PurgeSteps steps, PurgeOutcomes outcomes, PlatformTransactionManager transactions,
            @Value("${mlsuite.purge.batch-size}") int batchSize,
            @Value("${mlsuite.purge.lease-seconds}") int leaseSeconds,
            @Value("${mlsuite.purge.poll-ms}") long pollMs) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("PURGE_BATCH_SIZE must be at least 1.");
        }
        this.ledger = ledger;
        this.steps = steps;
        this.outcomes = outcomes;
        this.transactions = new TransactionTemplate(transactions);
        this.batchSize = batchSize;
        this.leaseSeconds = leaseSeconds;
        this.pollMs = pollMs;
    }

    @EventListener(ApplicationReadyEvent.class)
    void start() {
        schedule.scheduleWithFixedDelay(this::workQuietly, pollMs, pollMs, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void stop() {
        schedule.shutdownNow();
    }

    /** A failed round is logged and the next one still comes: an exception here would end the schedule. */
    private void workQuietly() {
        try {
            work();
        } catch (RuntimeException failure) {
            log.error("Could not run purges", failure);
        }
    }

    void work() {
        Optional<PurgeJob> claimed;
        while ((claimed = ledger.claim(worker, leaseSeconds)).isPresent()) {
            PurgeJob job = claimed.get();
            log.info("Purge {} of {} {} goes on from {}", job.id(), job.scope(), job.targetId(), job.phase());
            try {
                run(job);
            } catch (LostLease lost) {
                log.warn("Purge {} passed to another worker", job.id());
            } catch (RuntimeException failure) {
                log.error("Purge {} failed", job.id(), failure);
                outcomes.fail(job, worker, failure);
            }
        }
    }

    private void run(PurgeJob job) {
        for (PurgePhase phase : job.phase().fromHere()) {
            if (phase == PurgePhase.FINISH) {
                inBatch(job, () -> ledger.reach(job.id(), phase));
                if (!outcomes.complete(job, worker, leaseSeconds)) throw new LostLease();
                log.info("Purge {} of {} {} completed", job.id(), job.scope(), job.targetId());
                return;
            }
            for (PurgeStep step : transactions.execute(status -> steps.of(phase, job))) {
                drain(job, step);
            }
            inBatch(job, () -> ledger.reach(job.id(), phase.next()));
        }
    }

    /** One transaction per batch, so locks stay short and everything before it survives a crash. */
    private void drain(PurgeJob job, PurgeStep step) {
        int removed;
        do {
            int[] rows = new int[1];
            inBatch(job, () -> {
                rows[0] = step.batch().applyAsInt(batchSize);
                if (rows[0] > 0) ledger.add(job.id(), step.counter(), rows[0]);
            });
            removed = rows[0];
        } while (removed >= batchSize);
    }

    private void inBatch(PurgeJob job, Runnable work) {
        transactions.executeWithoutResult(status -> {
            if (!ledger.renew(job.id(), worker, leaseSeconds)) throw new LostLease();
            work.run();
        });
    }

    private static final class LostLease extends RuntimeException {
        private static final long serialVersionUID = 1L;
    }
}
