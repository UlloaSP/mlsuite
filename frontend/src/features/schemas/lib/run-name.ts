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

/**
 * The name, numbered past those the session already holds: two runs started in the same second
 * would otherwise share a default name, and a snapshot's run names are unique ignoring case.
 */
export const uniqueRunName = (name: string, taken: readonly string[]) => {
  const used = new Set(taken.map((other) => other.toLowerCase()));
  let candidate = name;
  for (let copy = 2; used.has(candidate.toLowerCase()); copy += 1) candidate = `${name} (${copy})`;
  return candidate;
};
