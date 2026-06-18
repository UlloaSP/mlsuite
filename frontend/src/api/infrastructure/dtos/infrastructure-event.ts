/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OverviewDeltaEvent, OverviewSnapshotEvent, ServiceLogEvent } from "./index";

export type InfrastructureEvent =
  | OverviewDeltaEvent
  | OverviewSnapshotEvent
  | ServiceLogEvent
  | { type: "error"; message: string };
