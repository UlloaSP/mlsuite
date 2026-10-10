/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CSSProperties } from "react";
import { MLSuiteMark } from "./MLSuiteMark";

const RADIUS = 150;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENTS = 8;
const GAP = 14;
/** The segment the load stopped on: those before it were reached, those after never were. */
const FAILED_SEGMENT = 5;

const dash = `${(CIRCUMFERENCE / SEGMENTS - GAP).toFixed(1)} ${CIRCUMFERENCE}`;
const rotation = (index: number) =>
  `rotate(${(-90 + (index * 360) / SEGMENTS + (GAP / CIRCUMFERENCE) * 180).toFixed(1)} 180 180)`;
const arc = { cx: 180, cy: 180, r: RADIUS, fill: "none", strokeWidth: 10 } as const;

/** The startup ring, stopped part-way: lit up to the failed segment, which turns red. */
export function RouteStatusRing({ label }: { label: string }) {
  return (
    <div className="route-status-ring">
      <svg viewBox="0 0 360 360" aria-hidden="true">
        <circle {...arc} className="route-status-ring-track" />
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <circle
            key={index}
            {...arc}
            className="route-status-ring-arc"
            data-reached={index <= FAILED_SEGMENT ? "" : undefined}
            strokeLinecap="round"
            strokeDasharray={dash}
            transform={rotation(index)}
            style={{ "--arc-index": index } as CSSProperties}
          />
        ))}
        <circle
          {...arc}
          className="route-status-ring-arc"
          data-failed=""
          strokeLinecap="round"
          strokeDasharray={dash}
          transform={rotation(FAILED_SEGMENT)}
        />
      </svg>
      <div className="route-status-ring-center">
        <MLSuiteMark size={44} />
        <span className="route-status-ring-label">{label}</span>
      </div>
    </div>
  );
}
