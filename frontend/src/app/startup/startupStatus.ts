/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { StartupServiceState } from "./startupServices";

export type StartupPhase = "starting" | "retrying" | "opening";

// Fixed status colors: they do not follow the theme.
const AMBER = "oklch(0.78 0.15 75)";
const RED = "oklch(0.64 0.21 25)";

/** Arc color and pulse period in seconds (0 = static) for each compose state. */
export const STARTUP_ARC: Record<StartupServiceState, { color: string; pulse: number }> = {
  created: { color: "color-mix(in oklch, var(--text-primary) 14%, transparent)", pulse: 0 },
  waiting: { color: "color-mix(in oklch, var(--text-primary) 22%, transparent)", pulse: 2.4 },
  starting: { color: "color-mix(in oklch, var(--accent-primary) 45%, transparent)", pulse: 1.2 },
  checking: { color: "color-mix(in oklch, var(--accent-primary) 75%, transparent)", pulse: 0.8 },
  healthy: { color: "var(--accent-primary)", pulse: 0 },
  running: { color: "var(--accent-primary)", pulse: 0 },
  completed: { color: "var(--accent-primary)", pulse: 0 },
  unhealthy: { color: AMBER, pulse: 1 },
  restarting: { color: AMBER, pulse: 0.5 },
  exited: { color: RED, pulse: 0 },
};

const FAILING = new Set<StartupServiceState>(["unhealthy", "restarting", "exited"]);

export function startupPhase(ready: boolean, states: StartupServiceState[]): StartupPhase {
  if (ready) return "opening";
  return states.some((state) => FAILING.has(state)) ? "retrying" : "starting";
}
