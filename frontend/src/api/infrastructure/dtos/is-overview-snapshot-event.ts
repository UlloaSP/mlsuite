/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InfrastructureEvent, OverviewSnapshotEvent } from "./index";

export function isOverviewSnapshotEvent(
  event: InfrastructureEvent,
): event is OverviewSnapshotEvent {
  return event.type === "overview.snapshot";
}
