/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion, type MotionValue, useTransform } from "motion/react";
import type { AuthReliefChannel } from "./authReliefChannels";

export function AuthReliefPulse({
  channel,
  flow,
}: {
  channel: AuthReliefChannel;
  flow: MotionValue<number>;
}) {
  const cycle = channel.pulse + channel.gap;
  const strokeDashoffset = useTransform(
    flow,
    (elapsed) => channel.phase + (elapsed * cycle) / (channel.duration * 1000),
  );

  return (
    <motion.path
      d={channel.d}
      fill="none"
      stroke="var(--accent-primary)"
      strokeDasharray={`${channel.pulse} ${channel.gap}`}
      strokeLinecap="round"
      strokeWidth={channel.width > 14 ? 3.5 : 2.25}
      vectorEffect="non-scaling-stroke"
      style={{ strokeDashoffset }}
    />
  );
}
