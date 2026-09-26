/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useState } from "react";
import type { StartupServiceState } from "./startupServices";
import { StartupRing } from "./StartupRing";
import { startupPhase } from "./startupStatus";
import "./startup-screen.css";

export const STARTUP_STUCK_MS = 60_000;

const TITLE = { starting: "Starting", retrying: "Retrying", opening: "Opening" } as const;

export function StartupScreen({
  ready,
  states,
}: {
  ready: boolean;
  states: StartupServiceState[];
}) {
  const phase = startupPhase(ready, states);
  const stuck = useHeldFor(phase === "retrying", STARTUP_STUCK_MS);

  return (
    <main className="startup-screen app-loading-reveal" data-startup-phase={phase}>
      <StartupRing states={states} />
      <h1 className="startup-title" role="status">
        <span className="font-extralight">{TITLE[phase]} </span>
        <span className="font-extrabold">MLsuite.</span>
      </h1>
      {stuck ? (
        <p className="startup-hint">
          Taking longer than usual — check <code>docker compose logs</code>
        </p>
      ) : null}
    </main>
  );
}

/** True once `active` has stayed true for `delayMs` without interruption. */
function useHeldFor(active: boolean, delayMs: number) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active) {
      setHeld(false);
      return;
    }
    const timeout = window.setTimeout(() => setHeld(true), delayMs);
    return () => window.clearTimeout(timeout);
  }, [active, delayMs]);

  return active && held;
}
