/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InfrastructureEvent, OverviewDeltaEvent } from "./index";

export function isOverviewDeltaEvent(event: InfrastructureEvent): event is OverviewDeltaEvent {
  return event.type === "overview.delta";
}
