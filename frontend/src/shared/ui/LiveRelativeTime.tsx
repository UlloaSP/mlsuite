/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSyncExternalStore } from "react";
import { formatTimestamp } from "@/shared/lib/date-time";
import { formatRelativeTime } from "@/shared/lib/relative-time";

// One clock for every relative time on the page: a single interval while any is
// mounted, and each instance re-renders only when its own text changes.
const clock = {
  now: Date.now(),
  listeners: new Set<() => void>(),
  timer: undefined as number | undefined,
};

const subscribe = (listener: () => void) => {
  clock.listeners.add(listener);
  if (clock.timer === undefined) {
    clock.now = Date.now();
    clock.timer = window.setInterval(() => {
      clock.now = Date.now();
      clock.listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0) {
      window.clearInterval(clock.timer);
      clock.timer = undefined;
    }
  };
};

/** When something happened, "47s ago" for the last week and its date after; its moment on hover. */
export function LiveRelativeTime({ value }: { value?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatRelativeTime(value, clock.now),
    () => formatRelativeTime(value),
  );
  if (!value || !Number.isFinite(Date.parse(value))) return <>{text}</>;
  return (
    <time dateTime={value} title={formatTimestamp(value)}>
      {text}
    </time>
  );
}
