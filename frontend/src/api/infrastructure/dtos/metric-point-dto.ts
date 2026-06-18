/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ServiceMetricPointDto } from "./index";

export type MetricPointDto = {
  timestamp: string;
  cpuPercent: number;
  ramPercent: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  services: ServiceMetricPointDto[];
};
