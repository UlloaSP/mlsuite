/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ServiceAggregateMetricValueDto, ServiceAggregateByteValueDto } from "./index";

export type ServiceAggregateMetricsDto = {
  cpu: ServiceAggregateMetricValueDto;
  ram: ServiceAggregateMetricValueDto;
  diskRead: ServiceAggregateByteValueDto;
  diskWrite: ServiceAggregateByteValueDto;
  networkRx: ServiceAggregateByteValueDto;
  networkTx: ServiceAggregateByteValueDto;
};
