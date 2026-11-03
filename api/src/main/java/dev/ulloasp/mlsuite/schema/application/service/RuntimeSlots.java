package dev.ulloasp.mlsuite.schema.application.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.LongFunction;
import java.util.function.Supplier;

/**
 * A share of the runtime: at most {@code maxConcurrent} runs of one kind use it at once, and the
 * runs that find it in use wait their turn in arrival order. A run first takes a place in the
 * queue, before any database work, so a run that cannot be served costs nothing: it is turned
 * away with {@code busy} when every place is taken, when its caller already holds
 * {@code maxPerCaller} places (running or waiting), so one caller cannot take the whole share, or
 * when its turn does not come within {@code maxWait} of taking its place.
 *
 * <p>{@code maxWait} bounds the wait, and the runtime read timeout bounds the run once it holds
 * a slot; together they bound the answer's time.
 */
public class RuntimeSlots {

    /** Whole seconds a turned-away caller is told to wait before trying again. */
    public static final long RETRY_AFTER_SECONDS = 2;

    private final Semaphore slots;
    private final AtomicInteger places = new AtomicInteger();
    private final ConcurrentHashMap<Object, Integer> callers = new ConcurrentHashMap<>();
    private final int maxPlaces;
    private final int maxPerCaller;
    private final long maxWaitNanos;
    private final LongFunction<RuntimeException> busy;
    private final LongAdder rejected = new LongAdder();

    /** Runs waiting for a slot now, and runs turned away since this instance started. */
    public record Load(int waiting, long rejected) {
    }

    protected RuntimeSlots(int maxConcurrent, RuntimeQueue queue, LongFunction<RuntimeException> busy) {
        if (maxConcurrent < 0 || queue.maxWaiting() < 0 || queue.maxPerCaller() < 1 || queue.maxWaitMs() < 0) {
            throw new IllegalArgumentException("Runtime shares and their queues cannot be negative, "
                    + "and RUNTIME_QUEUE_MAX_PER_CALLER must be at least 1.");
        }
        this.slots = new Semaphore(maxConcurrent, true);
        this.maxPlaces = maxConcurrent + queue.maxWaiting();
        this.maxPerCaller = queue.maxPerCaller();
        this.maxWaitNanos = TimeUnit.MILLISECONDS.toNanos(queue.maxWaitMs());
        this.busy = busy;
    }

    /** Takes a place for the caller's run, or turns it away; close the admission when the run ends. */
    public Admission admit(Object caller) {
        if (places.incrementAndGet() > maxPlaces) {
            places.decrementAndGet();
            throw turnedAway();
        }
        boolean[] taken = { false };
        callers.compute(caller, (key, held) -> {
            int count = held == null ? 0 : held;
            if (count >= maxPerCaller) return held;
            taken[0] = true;
            return count + 1;
        });
        if (!taken[0]) {
            places.decrementAndGet();
            throw turnedAway();
        }
        return new Admission(caller, System.nanoTime() + maxWaitNanos);
    }

    /** Admits the caller's run and does the work in a slot. */
    public <T> T run(Object caller, Supplier<T> work) {
        try (Admission admission = admit(caller)) {
            return admission.run(work);
        }
    }

    /** What the share is carrying, read without touching the admission path. */
    public Load load() {
        return new Load(waiting(), rejected.sum());
    }

    private RuntimeException turnedAway() {
        rejected.increment();
        return busy.apply(RETRY_AFTER_SECONDS);
    }

    /** Runs holding a place, running or waiting. */
    int placesTaken() {
        return places.get();
    }

    /** Runs waiting for a slot. */
    int waiting() {
        return slots.getQueueLength();
    }

    /** A caller's place in the queue, given back once however the run ends. */
    public final class Admission implements AutoCloseable {

        private final Object caller;
        private final long deadline;
        private final AtomicBoolean closed = new AtomicBoolean();

        private Admission(Object caller, long deadline) {
            this.caller = caller;
            this.deadline = deadline;
        }

        /** Waits for a slot until the admission's deadline and does the work in it. */
        public <T> T run(Supplier<T> work) {
            try {
                if (!slots.tryAcquire(Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS)) {
                    throw turnedAway();
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw turnedAway();
            }
            try {
                return work.get();
            } finally {
                slots.release();
            }
        }

        @Override
        public void close() {
            if (!closed.compareAndSet(false, true)) return;
            callers.computeIfPresent(caller, (key, held) -> held <= 1 ? null : held - 1);
            places.decrementAndGet();
        }
    }
}
