/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const runTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * A new run's default name: the bookmark it ran from and when, in the member's local time and
 * locale ("production · 9 Nov, 01:01:22"), so it agrees with the times shown beside it.
 */
export const createRunName = (bookmarkName: string | undefined, at = new Date()) => {
  const when = runTimeFormatter.format(at);
  const label = bookmarkName?.trim();
  return label ? `${label} · ${when}` : `Run · ${when}`;
};
