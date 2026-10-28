package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * How every runtime share queues the runs that find it in use: how many may wait, how many places
 * one caller may hold, running or waiting, and how long a run may wait for its turn.
 */
@Component
public record RuntimeQueue(
        @Value("${mlsuite.runtime-queue.max-waiting}") int maxWaiting,
        @Value("${mlsuite.runtime-queue.max-per-caller}") int maxPerCaller,
        @Value("${mlsuite.runtime-queue.max-wait-ms}") long maxWaitMs) {
}
