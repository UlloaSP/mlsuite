/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { AuthMode } from "./authLandingCopy";
import { AUTH_RELIEF_CHANNELS } from "./authReliefChannels";
import { AuthReliefPulse } from "./AuthReliefPulse";

export function AuthRelief({ mode }: { mode: AuthMode }) {
  const registering = mode === "register";
  const reliefRef = useRef<HTMLDivElement>(null);
  const inView = useInView(reliefRef, { amount: 0.1 });
  const reduceMotion = useReducedMotion();
  const flow = useMotionValue(0);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const animateRelief = inView && pageVisible && !reduceMotion;

  useEffect(() => {
    if (!animateRelief) return;

    let frameId = 0;
    let previousTime = performance.now();
    const updateFlow = (time: number) => {
      const delta = time - previousTime;
      previousTime = time;
      flow.set(flow.get() + delta * (registering ? 1 : -1));
      frameId = requestAnimationFrame(updateFlow);
    };

    frameId = requestAnimationFrame(updateFlow);
    return () => cancelAnimationFrame(frameId);
  }, [animateRelief, flow, registering]);

  return (
    <div ref={reliefRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg className="size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        <g opacity="0.78">
          {AUTH_RELIEF_CHANNELS.map((channel) => (
            <g key={channel.d}>
              <path
                d={channel.d}
                fill="none"
                stroke="var(--relief-groove-highlight)"
                strokeLinecap="round"
                strokeWidth={channel.width}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={channel.d}
                fill="none"
                stroke="var(--relief-groove-shadow)"
                strokeLinecap="round"
                strokeWidth={channel.width * 0.76}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={channel.d}
                fill="none"
                opacity="0.72"
                stroke="var(--surface-secondary)"
                strokeLinecap="round"
                strokeWidth={channel.width * 0.34}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>

        <g style={{ filter: "drop-shadow(0 0 5px var(--accent-primary))" }}>
          {AUTH_RELIEF_CHANNELS.map((channel) => (
            <AuthReliefPulse key={channel.d} channel={channel} flow={flow} />
          ))}
        </g>
      </svg>
    </div>
  );
}
