/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InfrastructureEvent, ServiceLogEvent } from "./index";

export function isServiceLogEvent(event: InfrastructureEvent): event is ServiceLogEvent {
  return event.type === "service.log.line";
}
