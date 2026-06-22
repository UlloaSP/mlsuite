/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InfrastructureOverviewDto } from "./index";

export type OverviewSnapshotEvent = {
  type: "overview.snapshot";
  payload: InfrastructureOverviewDto;
};
