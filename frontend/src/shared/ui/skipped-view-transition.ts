/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * Whether a rejection is a view transition the browser skipped: one superseded by the next
 * (switching tabs or organizations quickly) or started while the page was hidden. The update
 * itself still ran; only the animation was dropped, so it is not a failure.
 */
export const isSkippedViewTransition = (reason: unknown) =>
  reason instanceof DOMException &&
  (reason.name === "AbortError" || reason.name === "InvalidStateError") &&
  /transition/i.test(reason.message);

/**
 * The router starts a view transition for each navigation and leaves its `ready` promise
 * unobserved, so a skipped one surfaces as an uncaught rejection. This listener drops exactly
 * those and lets every other rejection through.
 */
export function ignoreSkippedViewTransitions(target: Window) {
  const ignore = (event: PromiseRejectionEvent) => {
    if (isSkippedViewTransition(event.reason)) event.preventDefault();
  };
  target.addEventListener("unhandledrejection", ignore);
  return () => target.removeEventListener("unhandledrejection", ignore);
}
