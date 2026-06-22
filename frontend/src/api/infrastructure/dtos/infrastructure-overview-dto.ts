/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ServiceAggregateMetricsDto, MetricSeriesDto, ServiceStatusDto } from "./index";

export type InfrastructureOverviewDto = {
  aggregate: ServiceAggregateMetricsDto;
  services: ServiceStatusDto[];
  history: MetricSeriesDto;
};
