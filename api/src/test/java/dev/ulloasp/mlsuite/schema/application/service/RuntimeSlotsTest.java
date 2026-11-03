package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * A runtime share queues the runs that find it in use, in arrival order, and turns a run away
 * (with a Retry-After) only when it cannot be queued or its turn does not come in time.
 */
class RuntimeSlotsTest {

    private final ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();

    @AfterEach
    void stopThePool() {
        pool.shutdownNow();
    }

    /** Turned away, with how long to wait. */
    static final class Busy extends RuntimeException {
        final long retryAfter;

        Busy(long retryAfter) {
            this.retryAfter = retryAfter;
        }
    }

    private static RuntimeSlots slots(int concurrent, int waiting, int perCaller, long waitMs) {
        return new RuntimeSlots(concurrent, new RuntimeQueue(waiting, perCaller, waitMs), Busy::new) {
        };
    }

    @Test
    void theShareCountsEveryRunItTurnsAwayAndTheRunsWaiting() throws Exception {
        RuntimeSlots full = slots(0, 0, 4, 0);
        assertThrows(Busy.class, () -> full.run("ana", () -> "never"));
        RuntimeSlots perCaller = slots(1, 4, 1, 0);
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        var holder = CompletableFuture.supplyAsync(() -> perCaller.run("ana", () -> {
            running.countDown();
            await(finish);
            return "done";
        }), pool);
        assertTrue(running.await(10, TimeUnit.SECONDS));
        assertThrows(Busy.class, () -> perCaller.run("ana", () -> "never"));
        assertThrows(Busy.class, () -> perCaller.run("ben", () -> "timed out"));
        RuntimeSlots patient = slots(1, 4, 4, 10_000);
        var occupant = CompletableFuture.supplyAsync(() -> patient.run("ana", () -> {
            await(finish);
            return "done";
        }), pool);
        waitUntil(() -> patient.placesTaken() == 1);
        var queued = CompletableFuture.supplyAsync(() -> patient.run("ben", () -> "ran"), pool);
        waitUntil(() -> patient.waiting() == 1);

        assertEquals(new RuntimeSlots.Load(0, 1), full.load());
        assertEquals(new RuntimeSlots.Load(0, 2), perCaller.load());
        assertEquals(new RuntimeSlots.Load(1, 0), patient.load());

        finish.countDown();
        assertEquals("done", holder.get(10, TimeUnit.SECONDS));
        assertEquals("done", occupant.get(10, TimeUnit.SECONDS));
        assertEquals("ran", queued.get(10, TimeUnit.SECONDS));
    }

    @Test
    void aRunFindingTheShareInUseWaitsItsTurnAndRuns() throws Exception {
        RuntimeSlots slots = slots(1, 4, 4, 10_000);
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        var first = CompletableFuture.supplyAsync(() -> slots.run("ana", () -> {
            running.countDown();
            await(finish);
            return "first";
        }), pool);
        assertTrue(running.await(10, TimeUnit.SECONDS));

        var second = CompletableFuture.supplyAsync(() -> slots.run("ben", () -> "second"), pool);
        Thread.sleep(100);
        assertFalse(second.isDone());

        finish.countDown();
        assertEquals("first", first.get(10, TimeUnit.SECONDS));
        assertEquals("second", second.get(10, TimeUnit.SECONDS));
    }

    @Test
    void waitingRunsAreServedInArrivalOrder() throws Exception {
        RuntimeSlots slots = slots(1, 8, 8, 10_000);
        CountDownLatch finish = new CountDownLatch(1);
        CountDownLatch running = new CountDownLatch(1);
        List<Integer> order = new CopyOnWriteArrayList<>();
        var holder = CompletableFuture.runAsync(() -> slots.run("holder", () -> {
            running.countDown();
            await(finish);
            return null;
        }), pool);
        assertTrue(running.await(10, TimeUnit.SECONDS));
        List<CompletableFuture<Void>> waiters = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            int n = i;
            waiters.add(CompletableFuture.runAsync(() -> slots.run("caller-" + n, () -> order.add(n)), pool));
            waitUntil(() -> slots.waiting() == n + 1);
        }

        finish.countDown();
        holder.get(10, TimeUnit.SECONDS);
        for (var waiter : waiters) waiter.get(10, TimeUnit.SECONDS);
        assertEquals(List.of(0, 1, 2, 3, 4), order);
    }

    @Test
    void aRunIsTurnedAwayWithRetryAfterWhenEveryPlaceIsTaken() throws Exception {
        RuntimeSlots slots = slots(1, 1, 4, 10_000);
        CountDownLatch finish = new CountDownLatch(1);
        CountDownLatch running = new CountDownLatch(1);
        var first = CompletableFuture.runAsync(() -> slots.run("ana", () -> {
            running.countDown();
            await(finish);
            return null;
        }), pool);
        assertTrue(running.await(10, TimeUnit.SECONDS));
        var second = CompletableFuture.runAsync(() -> slots.run("ben", () -> null), pool);
        waitUntil(() -> slots.placesTaken() == 2);

        Busy busy = assertThrows(Busy.class, () -> slots.admit("carl"));
        assertEquals(RuntimeSlots.RETRY_AFTER_SECONDS, busy.retryAfter);

        finish.countDown();
        first.get(10, TimeUnit.SECONDS);
        second.get(10, TimeUnit.SECONDS);
        assertEquals("next", slots.run("carl", () -> "next"));
    }

    @Test
    void oneCallerCannotTakeMoreThanItsPlacesWhileOthersStillQueue() {
        RuntimeSlots slots = slots(1, 10, 2, 10_000);
        RuntimeSlots.Admission one = slots.admit("ana");
        RuntimeSlots.Admission two = slots.admit("ana");

        assertThrows(Busy.class, () -> slots.admit("ana"));
        try (RuntimeSlots.Admission other = slots.admit("ben")) {
            assertTrue(other != null);
        }

        one.close();
        try (RuntimeSlots.Admission again = slots.admit("ana")) {
            assertTrue(again != null);
        }
        two.close();
    }

    @Test
    void aRunWhoseTurnDoesNotComeInTimeIsTurnedAwayAndGivesItsPlaceBack() throws Exception {
        RuntimeSlots slots = slots(1, 1, 4, 50);
        CountDownLatch finish = new CountDownLatch(1);
        CountDownLatch running = new CountDownLatch(1);
        var first = CompletableFuture.runAsync(() -> slots.run("ana", () -> {
            running.countDown();
            await(finish);
            return null;
        }), pool);
        assertTrue(running.await(10, TimeUnit.SECONDS));

        assertThrows(Busy.class, () -> slots.run("ben", () -> "never"));
        // Its place was given back: the next run can queue again rather than find the queue full.
        assertThrows(Busy.class, () -> slots.run("ben", () -> "never"));

        finish.countDown();
        first.get(10, TimeUnit.SECONDS);
    }

    @Test
    void theSlotAndPlaceAreReturnedHoweverTheWorkEnds() {
        RuntimeSlots slots = slots(1, 0, 1, 0);

        assertThrows(IllegalStateException.class, () -> slots.run("ana", () -> {
            throw new IllegalStateException("boom");
        }));
        assertEquals("ok", slots.run("ana", () -> "ok"));
    }

    @Test
    void closingAnAdmissionTwiceGivesItsPlaceBackOnce() {
        RuntimeSlots slots = slots(1, 0, 1, 0);
        RuntimeSlots.Admission admission = slots.admit("ana");
        admission.close();
        admission.close();

        RuntimeSlots.Admission next = slots.admit("ben");
        assertThrows(Busy.class, () -> slots.admit("carl"));
        next.close();
    }

    @Test
    void anInterruptedWaitIsTurnedAwayAndKeepsTheInterrupt() throws Exception {
        RuntimeSlots slots = slots(0, 1, 1, 10_000);
        try (RuntimeSlots.Admission admission = slots.admit("ana")) {
            Thread.currentThread().interrupt();
            assertThrows(Busy.class, () -> admission.run(() -> "never"));
            assertTrue(Thread.interrupted());
        }
    }

    @Test
    void aShareWithoutRoomTurnsEveryRunAwayAtOnce() {
        RuntimeSlots slots = slots(0, 0, 1, 10_000);

        assertThrows(Busy.class, () -> slots.admit("ana"));
    }

    @Test
    void aNegativeShareOrNoPlacePerCallerIsRefusedAtStartup() {
        assertThrows(IllegalArgumentException.class, () -> slots(-1, 0, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> slots(1, -1, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> slots(1, 0, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> slots(1, 0, 1, -1));
    }

    private static void waitUntil(BooleanSupplier condition) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (!condition.getAsBoolean()) {
            if (System.nanoTime() > deadline) throw new AssertionError("the runs never queued");
            Thread.sleep(5);
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS));
        } catch (InterruptedException interrupted) {
            throw new IllegalStateException(interrupted);
        }
    }
}
