/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { MetricPointDto } from "./index";

export type MetricSeriesDto = {
  sampleIntervalSeconds: number;
  retentionMinutes: number;
  points: MetricPointDto[];
};
