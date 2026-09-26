/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSyncExternalStore } from "react";
import { formatCompactRelativeTime } from "@/shared/lib/relative-time";

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

export function LiveRelativeTime({ value }: { value?: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatCompactRelativeTime(value, clock.now),
    () => formatCompactRelativeTime(value),
  );
  return <>{text}</>;
}
