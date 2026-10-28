/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isHttpError } from "@/shared/api/http";

/** Tries a request turned away as busy this many times in all. */
export const BUSY_ATTEMPTS = 6;
const MAX_WAIT_MS = 10_000;

const waitFor = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", stop, { once: true });
  });

/** Waits the server's Retry-After at least, longer on each attempt, never past the cap. */
export const busyWaitMs = (
  retryAfterSeconds: number | undefined,
  attempt: number,
  jitter: number,
) =>
  Math.min(MAX_WAIT_MS, Math.max((retryAfterSeconds ?? 1) * 1000, 500 * 2 ** attempt)) +
  Math.round(jitter * 250);

/**
 * Sends a request again while the server answers 503 (its queue for the work was full), waiting
 * what its Retry-After asks with growing, jittered waits, and gives up after a bounded number of
 * attempts with the last refusal. Any other failure, and an abort, end it at once.
 */
export async function retryWhileBusy<T>(
  request: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (
        !isHttpError(error) ||
        error.status !== 503 ||
        attempt >= BUSY_ATTEMPTS ||
        signal?.aborted
      )
        throw error;
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Each retry waits for the one before it.
      await waitFor(busyWaitMs(error.retryAfterSeconds, attempt, Math.random()), signal);
    }
  }
}
