/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { MetricPointDto, ServiceStatusDto } from "./index";

export type OverviewDeltaEvent = {
  type: "overview.delta";
  payload: {
    aggregate: MetricPointDto;
    services: ServiceStatusDto[];
  };
};
