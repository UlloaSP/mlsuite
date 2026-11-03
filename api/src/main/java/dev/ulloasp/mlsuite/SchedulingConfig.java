package dev.ulloasp.mlsuite;

import org.springframework.boot.task.ThreadPoolTaskSchedulerBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Runs {@code @Scheduled} tasks on a pool. Left to itself, with virtual threads enabled, Spring Boot
 * picks a scheduler that runs every fixed-delay task on one thread, whatever the pool size says, so
 * a bulk job would hold up model preparation and every other task until it ended.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
class SchedulingConfig {

    @Bean
    ThreadPoolTaskScheduler taskScheduler(ThreadPoolTaskSchedulerBuilder builder) {
        return builder.build();
    }
}
