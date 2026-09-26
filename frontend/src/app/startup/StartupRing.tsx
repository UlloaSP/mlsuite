/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { StartupServiceState } from "./startupServices";
import { STARTUP_ARC } from "./startupStatus";

const GAP_DEGREES = 2;

export function StartupRing({ states }: { states: StartupServiceState[] }) {
  // Until ops-agent answers there is nothing to report, so draw one neutral track.
  const arcs: StartupServiceState[] = states.length ? states : ["created"];
  const span = 360 / arcs.length;
  const gap = arcs.length > 1 ? GAP_DEGREES : 0;

  return (
    <div aria-hidden="true" className="startup-ring">
      {arcs.map((state, index) => {
        const { color, pulse } = STARTUP_ARC[state];
        const from = index * span + gap;
        const to = (index + 1) * span - gap;
        return (
          <div
            key={index}
            className="startup-ring-arc"
            data-pulse={pulse > 0 || undefined}
            style={{
              background: `conic-gradient(from -90deg, transparent ${from}deg, ${color} ${from}deg ${to}deg, transparent ${to}deg)`,
              animationDuration: pulse > 0 ? `${pulse}s` : undefined,
            }}
          />
        );
      })}
      <img alt="" className="startup-ring-mark" height="635" src="/mlsuite.png" width="1181" />
    </div>
  );
}
