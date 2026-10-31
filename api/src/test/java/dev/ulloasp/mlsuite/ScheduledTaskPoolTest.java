package dev.ulloasp.mlsuite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.task.TaskSchedulingAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/** With the application's own settings, long tasks leave the short ones running. */
class ScheduledTaskPoolTest {

    /** Stand-ins for what can hold a thread for minutes: a bulk job, a model's preparation, a long refresh. */
    @Configuration(proxyBeanMethods = false)
    static class Tasks {

        static final int LONG_TASKS = 3;
        static final CountDownLatch released = new CountDownLatch(1);
        static final CountDownLatch holding = new CountDownLatch(LONG_TASKS);
        static final CountDownLatch shortTaskRan = new CountDownLatch(1);
        static final AtomicInteger bulkJobsRunning = new AtomicInteger();
        static final AtomicInteger mostBulkJobsRunning = new AtomicInteger();

        @Scheduled(fixedDelay = 1)
        void bulkJob() throws InterruptedException {
            mostBulkJobsRunning.accumulateAndGet(bulkJobsRunning.incrementAndGet(), Math::max);
            hold();
            bulkJobsRunning.decrementAndGet();
        }

        @Scheduled(fixedDelay = 1)
        void modelPreparation() throws InterruptedException {
            hold();
        }

        @Scheduled(fixedDelay = 1)
        void inferenceRows() throws InterruptedException {
            hold();
        }

        @Scheduled(fixedDelay = 1)
        void retention() {
            shortTaskRan.countDown();
        }

        private void hold() throws InterruptedException {
            holding.countDown();
            released.await(30, TimeUnit.SECONDS);
        }
    }

    @Test
    void shortTasksRunWhileEveryLongTaskHoldsAThreadAndNoTaskOverlapsItself() {
        new ApplicationContextRunner()
                .withSystemProperties("SPRING_PROFILES_ACTIVE=test")
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withConfiguration(AutoConfigurations.of(TaskSchedulingAutoConfiguration.class))
                .withUserConfiguration(SchedulingConfig.class, Tasks.class)
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    try {
                        assertTrue(Tasks.holding.await(10, TimeUnit.SECONDS), "every long task runs at once");
                        assertTrue(Tasks.shortTaskRan.await(10, TimeUnit.SECONDS), "a short task runs meanwhile");
                        assertEquals(1, Tasks.mostBulkJobsRunning.get());
                    } finally {
                        Tasks.released.countDown();
                    }
                });
    }
}
