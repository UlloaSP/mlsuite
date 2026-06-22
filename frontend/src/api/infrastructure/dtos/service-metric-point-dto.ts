/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type ServiceMetricPointDto = {
  name: string;
  cpuPercent: number;
  ramPercent: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
};
