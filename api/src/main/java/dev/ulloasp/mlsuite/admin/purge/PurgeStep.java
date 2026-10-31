package dev.ulloasp.mlsuite.admin.purge;

import java.util.function.IntUnaryOperator;

/**
 * One thing a phase does, again and again until nothing is left: {@code batch} removes up to the
 * given number of rows and says how many it found. Running it after a crash, or twice, finds only
 * what is left. {@code counter} names what it removes in the job's counts.
 */
record PurgeStep(String counter, IntUnaryOperator batch) {
}
