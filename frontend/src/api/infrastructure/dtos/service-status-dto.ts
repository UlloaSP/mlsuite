/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type ServiceStatusDto = {
  name: string;
  containerName: string | null;
  status: string;
  health: string | null;
  uptime: string | null;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryLimitBytes: number | null;
  diskReadBytes: number | null;
  diskWriteBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  ports: string[];
  terminalEnabled: boolean;
};
